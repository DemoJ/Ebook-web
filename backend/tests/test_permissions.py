from .conftest import create_user, login, upload


def test_private_shared_and_admin_body_permissions(client):
    create_user(client, "owner")
    create_user(client, "reader")
    login(client, "owner", "password123")
    book = upload(client)
    client.post("/api/auth/logout")

    login(client, "reader", "password123")
    assert client.get(f"/api/books/{book['id']}/file").status_code == 403
    client.post("/api/auth/logout")
    login(client, "root", "root-password")
    assert client.get(f"/api/books/{book['id']}/file").status_code == 403
    client.post("/api/auth/logout")

    login(client, "owner", "password123")
    assert client.put(f"/api/books/{book['id']}", json={"visibility": "shared"}).status_code == 200
    client.post("/api/auth/logout")
    login(client, "reader", "password123")
    assert client.post(f"/api/books/{book['id']}/shelf").status_code == 204
    assert client.get(f"/api/books/{book['id']}/file").status_code == 200


def test_private_change_removes_other_users_shelf_access(client):
    create_user(client, "owner2")
    create_user(client, "reader2")
    login(client, "owner2", "password123")
    book = upload(client, "Shared then private")
    client.put(f"/api/books/{book['id']}", json={"visibility": "shared"})
    client.post("/api/auth/logout")
    login(client, "reader2", "password123")
    client.post(f"/api/books/{book['id']}/shelf")
    client.post("/api/auth/logout")
    login(client, "owner2", "password123")
    client.put(f"/api/books/{book['id']}", json={"visibility": "private"})
    owner_shelf = client.get("/api/books/shelf").json()
    assert any(item["id"] == book["id"] for item in owner_shelf)
    client.post("/api/auth/logout")
    login(client, "reader2", "password123")
    assert client.get(f"/api/books/{book['id']}/file").status_code == 403
    assert client.get("/api/books/shelf").json() == []
