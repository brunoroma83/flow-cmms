"""
MCP (Model Context Protocol) Server for Flow-CMMS
Provides isolated multi-tenant tools for AI agents.
"""
from app.mcp.server import mcp_server, create_mcp_app

__all__ = ["mcp_server", "create_mcp_app"]
