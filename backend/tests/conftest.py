import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.security import _buckets

@pytest.fixture
def setup():
    engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory=sessionmaker(engine,expire_on_commit=False)
    def dependency():
        with factory() as db: yield db
    app.dependency_overrides[get_db]=dependency
    _buckets.clear()
    yield factory
    app.dependency_overrides.clear()
    engine.dispose()

@pytest.fixture
def client(setup):
    with TestClient(app) as client: yield client

@pytest.fixture
def demo(client):
    response=client.post('/api/demo')
    assert response.status_code==200,response.text
    client.headers['X-CSRF-Token']=response.json()['csrf']
    return client

@pytest.fixture
def lead_data():
    return {'name':'Test Buyer','email':'buyer@example.com','company':'Fictional Works','service':'AI automation','message':'We need a proposal for automating our internal support workflow. We would like to launch in 6 weeks.','budget':120000,'source':'Referral'}
