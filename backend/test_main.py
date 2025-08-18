"""Basic health check tests for the FastAPI backend"""
import subprocess
import time
import requests
import pytest


def test_app_can_start():
    """Test that the FastAPI app can be imported and started"""
    try:
        from main import app
        assert app is not None
        assert app.title == "Shortbread API"
    except ImportError:
        pytest.fail("Could not import main app")


def test_health_endpoint_integration():
    """Integration test for health endpoint using real HTTP request"""
    # Start the server in background
    process = subprocess.Popen(
        ["python", "main.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    time.sleep(2)
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["message"] == "Shortbread API is running"
        assert data["version"] == "1.0.0"
        
        # Test root endpoint
        response = requests.get("http://localhost:8000/", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome to Shortbread API"
        
    finally:
        # Clean up: terminate the server process
        process.terminate()
        process.wait(timeout=5)