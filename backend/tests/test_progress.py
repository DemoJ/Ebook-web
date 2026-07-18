from .conftest import create_user, login, upload


def test_reading_progress_is_isolated_per_user(client):
    create_user(client, "uploader")
    create_user(client, "reader")
    login(client, "uploader", "password123")
    book = upload(client, "Progress Book")
    client.put(f"/api/books/{book['id']}", json={"visibility": "shared"})
    owner_progress = {"location": "epubcfi(/6/2)", "percentage": 10, "chapter": "One"}
    assert client.put(f"/api/books/{book['id']}/progress", json=owner_progress).status_code == 200
    client.post("/api/auth/logout")

    login(client, "reader", "password123")
    assert client.get(f"/api/books/{book['id']}/progress").status_code == 404
    reader_progress = {"location": "epubcfi(/6/8)", "percentage": 75.5, "chapter": "Four"}
    assert client.put(f"/api/books/{book['id']}/progress", json=reader_progress).status_code == 200
    assert client.get(f"/api/books/{book['id']}/progress").json()["location"] == "epubcfi(/6/8)"
    client.post("/api/auth/logout")

    login(client, "uploader", "password123")
    progress = client.get(f"/api/books/{book['id']}/progress").json()
    assert progress["location"] == "epubcfi(/6/2)"
    assert progress["percentage"] == 10
