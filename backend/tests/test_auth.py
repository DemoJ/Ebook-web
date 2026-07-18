from .conftest import create_user, login


def test_superadmin_login_logout_and_current_user(client):
    assert client.get("/api/auth/me").status_code == 401
    login(client, "root", "root-password")
    current = client.get("/api/auth/me")
    assert current.status_code == 200
    assert current.json()["is_superuser"] is True
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_change_password_and_disable_user(client):
    user = create_user(client, "alice")
    login(client, "alice", "password123")
    changed = client.put(
        "/api/auth/password",
        json={"current_password": "password123", "new_password": "new-password123"},
    )
    assert changed.status_code == 204
    client.post("/api/auth/logout")
    login(client, "root", "root-password")
    assert client.patch(f"/api/admin/users/{user['id']}", json={"is_active": False}).status_code == 200
    client.post("/api/auth/logout")
    assert client.post(
        "/api/auth/login", json={"username": "alice", "password": "new-password123"}
    ).status_code == 401
