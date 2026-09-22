import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)

client = TestClient(app)

def test_token_creation_and_validation():
    user_id = 'test-user-123'
    email = 'testtoken@example.com'
    name = 'Token Test'

    access = create_access_token(user_id=user_id, email=email, name=name)
    refresh = create_refresh_token(user_id=user_id, email=email, name=name)

    assert access is not None
    assert refresh is not None
    assert access != refresh

    acc_payload = decode_access_token(access)
    assert acc_payload is not None
    assert acc_payload['sub'] == user_id
    assert acc_payload['email'] == email
    assert acc_payload['token_type'] == 'access'

    ref_payload = decode_refresh_token(refresh)
    assert ref_payload is not None
    assert ref_payload['sub'] == user_id
    assert ref_payload['email'] == email
    assert ref_payload['token_type'] == 'refresh'

    assert decode_refresh_token(access) is None
    assert decode_access_token(refresh) is None


def test_auth_register_login_and_refresh_flow():
    import time
    email = f'auth_flow_{int(time.time())}@test.com'
    password = 'securePassword123'
    name = 'Auth Flow User'

    # 1. Register & Verify OTP
    reg_res = client.post('/api/auth/register', json={
        'email': email,
        'password': password,
        'name': name,
    })
    assert reg_res.status_code == 200, reg_res.text
    assert reg_res.json()['status'] == 'otp_required'

    from backend.db.database import db_manager
    pending = db_manager.get_pending_registration(email)
    assert pending is not None
    otp_code = pending['otp']

    verify_res = client.post('/api/auth/verify-otp', json={
        'email': email,
        'otp': otp_code,
    })
    assert verify_res.status_code == 200, verify_res.text
    reg_data = verify_res.json()
    assert 'access_token' in reg_data
    assert 'refresh_token' in reg_data
    assert reg_data['user']['email'] == email

    access_token = reg_data['access_token']
    refresh_token = reg_data['refresh_token']

    # 2. Access protected endpoint with access token
    me_res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {access_token}'})
    assert me_res.status_code == 200
    assert me_res.json()['email'] == email

    # 3. Refresh token
    refresh_res = client.post('/api/auth/refresh', json={
        'refresh_token': refresh_token,
    })
    assert refresh_res.status_code == 200, refresh_res.text
    refresh_data = refresh_res.json()
    assert 'access_token' in refresh_data
    assert 'refresh_token' in refresh_data
    new_access_token = refresh_data['access_token']
    assert new_access_token != access_token

    # 4. Use new access token to query /me
    me_new_res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {new_access_token}'})
    assert me_new_res.status_code == 200
    assert me_new_res.json()['email'] == email

    # 5. Invalid refresh token rejection
    bad_refresh = client.post('/api/auth/refresh', json={
        'refresh_token': 'invalid.fake.token',
    })
    assert bad_refresh.status_code == 401

    # 6. Passing access token to refresh endpoint rejection
    acc_as_ref = client.post('/api/auth/refresh', json={
        'refresh_token': access_token,
    })
    assert acc_as_ref.status_code == 401
