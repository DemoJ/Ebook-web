import io
import posixpath
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from xml.etree import ElementTree

from fastapi import HTTPException, status

from .config import Settings


@dataclass
class EpubMetadata:
    title: str
    author: str
    cover: bytes | None
    cover_extension: str | None


def _reject(message: str) -> None:
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, message)


def _safe_name(name: str) -> bool:
    path = PurePosixPath(name.replace("\\", "/"))
    return not path.is_absolute() and ".." not in path.parts


def _check_archive(archive: zipfile.ZipFile, settings: Settings) -> None:
    entries = archive.infolist()
    if len(entries) > settings.max_epub_entries:
        _reject("EPUB has too many entries")
    total = 0
    for entry in entries:
        if not _safe_name(entry.filename):
            _reject("EPUB contains an unsafe path")
        total += entry.file_size
        if total > settings.max_uncompressed_bytes:
            _reject("EPUB uncompressed size is too large")
        ratio = entry.file_size / max(entry.compress_size, 1)
        if ratio > settings.max_compression_ratio:
            _reject("EPUB compression ratio is unsafe")
    names = {entry.filename for entry in entries}
    if "mimetype" not in names or "META-INF/container.xml" not in names:
        _reject("EPUB is missing required files")
    mime_info = archive.getinfo("mimetype")
    if mime_info.compress_type != zipfile.ZIP_STORED:
        _reject("EPUB mimetype must be uncompressed")
    if archive.read("mimetype") != b"application/epub+zip":
        _reject("Invalid EPUB mimetype")


def _rootfile(archive: zipfile.ZipFile) -> str:
    try:
        root = ElementTree.fromstring(archive.read("META-INF/container.xml"))
    except ElementTree.ParseError:
        _reject("Invalid EPUB container.xml")
    node = root.find(".//{*}rootfile")
    path = node.get("full-path") if node is not None else None
    if not path or not _safe_name(path) or path not in archive.namelist():
        _reject("EPUB package document was not found")
    return path


def _text(root: ElementTree.Element, name: str, default: str) -> str:
    node = root.find(f".//{{*}}{name}")
    value = "" if node is None or node.text is None else node.text.strip()
    return value[:300] or default


def _cover_path(root: ElementTree.Element, opf_path: str) -> str | None:
    cover_id = None
    for meta in root.findall(".//{*}meta"):
        if meta.get("name") == "cover":
            cover_id = meta.get("content")
    for item in root.findall(".//{*}item"):
        properties = item.get("properties", "").split()
        if item.get("id") == cover_id or "cover-image" in properties:
            href = item.get("href")
            if href:
                return posixpath.normpath(posixpath.join(posixpath.dirname(opf_path), href))
    return None


def inspect_epub(data: bytes, settings: Settings) -> EpubMetadata:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        _reject("File is not a valid ZIP archive")
    with archive:
        _check_archive(archive, settings)
        opf_path = _rootfile(archive)
        try:
            root = ElementTree.fromstring(archive.read(opf_path))
        except ElementTree.ParseError:
            _reject("Invalid EPUB package document")
        title = _text(root, "title", "Untitled")
        authors = [n.text.strip() for n in root.findall(".//{*}creator") if n.text and n.text.strip()]
        author = ", ".join(authors)[:300] or "Unknown"
        cover_path = _cover_path(root, opf_path)
        cover = archive.read(cover_path) if cover_path in archive.namelist() else None
        extension = PurePosixPath(cover_path).suffix.lower() if cover_path else None
        return EpubMetadata(title, author, cover, extension)
