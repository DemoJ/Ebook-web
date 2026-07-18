import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        secret_key="test-secret-key-with-enough-length",
        storage_dir=tmp_path / "storage",
        superadmin_username="root",
        superadmin_password="root-password",
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def login(client, username, password):
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response


def create_user(client, username, password="password123"):
    login(client, "root", "root-password")
    response = client.post(
        "/api/admin/users",
        json={"username": username, "password": password, "is_admin": False},
    )
    assert response.status_code == 201
    client.post("/api/auth/logout")
    return response.json()


def epub_bytes(title="Test Book", author="Test Author"):
    container = """<?xml version="1.0"?>
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>"""
    package = f"""<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>{title}</dc:title><dc:creator>{author}</dc:creator>
      </metadata><manifest/><spine/>
    </package>"""
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr("META-INF/container.xml", container)
        archive.writestr("OPS/content.opf", package)
    return output.getvalue()


def upload(client, title="Test Book"):
    response = client.post(
        "/api/books",
        files={"file": ("book.epub", epub_bytes(title), "application/epub+zip")},
    )
    assert response.status_code == 201, response.text
    return response.json()
