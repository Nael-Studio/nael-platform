# Exploring the Nael Framework MCP Server

This guide shows you all the ways to discover and use what's available in the MCP server.

## 🔍 Method 1: MCP Inspector (Interactive UI)

The **MCP Inspector** provides a web-based UI to explore all tools, prompts, and resources interactively.

### Launch the Inspector:

**EASIEST WAY - Use the npm script:**
```bash
cd packages/mcp-server
bun run inspector
```

**Or manually with the correct path:**
```bash
cd packages/mcp-server
bunx @modelcontextprotocol/inspector bun run ./src/server.ts
```

This will:
- Start a local web server
- Open your browser automatically
- Show an interactive UI where you can:
  - ✅ Browse all **7 tools**
  - ✅ Browse all **4 prompts**
  - ✅ Browse all **17 resources**
  - ✅ Test tools with different parameters
  - ✅ See real responses
  - ✅ Copy code examples

**The browser should open automatically at:** `http://localhost:6274/`

---

## 📚 Method 2: README Documentation

Check the main `README.md` file which lists everything:

```bash
cat packages/mcp-server/README.md
```

### Quick Summary from README:

#### 🛠️ **7 Tools Available:**
1. `search-api` - Search decorators, classes, methods, interfaces
2. `get-example` - Get code examples by use case
3. `get-decorator-info` - Detailed decorator information
4. `get-best-practices` - Best practices by category
5. `troubleshoot` - Get troubleshooting solutions
6. `list-packages` - List all available packages
7. `compare-packages` - Compare multiple packages

#### 💬 **4 Prompts Available:**
1. `create-feature` - Generate a new feature with best practices
2. `debug-issue` - Help debug framework-related issues
3. `optimize-code` - Get optimization suggestions
4. `migration-guide` - Help migrate between versions

#### 📖 **17 Resources Available:**
- Package overviews (8 packages)
- Quick start guides
- Architecture documentation
- Performance tips
- Security best practices
- Testing guides
- Deployment guides
- Migration guides
- Examples by category

---

## 📦 Method 3: List Packages Programmatically

If the MCP server is connected to your AI assistant, you can ask:

### Example Queries:

```
"What packages are available in Nael Framework?"
"Show me all decorators in the HTTP package"
"Give me an example of GraphQL setup"
"What are best practices for ORM?"
"How do I troubleshoot authentication issues?"
```

The AI will use the MCP tools to fetch this information automatically.

---

## 🔧 Method 4: Direct Tool Usage (In Claude Desktop/Cursor)

Once configured, you can directly ask Claude:

### Tool Examples:

**Search API:**
```
"Find all decorators related to HTTP routing"
→ Uses: search-api tool
```

**Get Examples:**
```
"Show me how to create a REST API with JWT authentication"
→ Uses: get-example tool
```

**Get Decorator Info:**
```
"Explain the @Controller decorator"
→ Uses: get-decorator-info tool
```

**Best Practices:**
```
"What are security best practices for the auth package?"
→ Uses: get-best-practices tool
```

**Troubleshooting:**
```
"My ORM connection is failing, help me debug it"
→ Uses: troubleshoot tool
```

---

## 📋 Complete Inventory

### All 8 Packages Documented:

1. **`@nl-framework/http`** - REST APIs, routing, middleware
2. **`@nl-framework/graphql`** - GraphQL APIs, resolvers, subscriptions
3. **`@nl-framework/platform`** - Core platform features
4. **`@nl-framework/config`** - Configuration management
5. **`@nl-framework/logger`** - Logging and monitoring
6. **`@nl-framework/orm`** - MongoDB ORM with decorators
7. **`@nl-framework/auth`** - Authentication and authorization
8. **`@nl-framework/microservices`** - Dapr microservices

### Resources Breakdown:

#### Package Resources (8):
- `package://http/overview`
- `package://graphql/overview`
- `package://platform/overview`
- `package://config/overview`
- `package://logger/overview`
- `package://orm/overview`
- `package://auth/overview`
- `package://microservices/overview`

#### Documentation Resources (9):
- `docs://getting-started`
- `docs://architecture`
- `docs://best-practices/performance`
- `docs://best-practices/security`
- `docs://testing`
- `docs://deployment`
- `docs://migration/v1-to-v2`
- `examples://category/authentication`
- `examples://category/database`

---

## 🎯 Quick Reference Card

| What You Want | Use This Tool |
|---------------|---------------|
| Find a decorator/class/method | `search-api` |
| Get a code example | `get-example` |
| Learn decorator parameters | `get-decorator-info` |
| Best practices for a topic | `get-best-practices` |
| Fix an error/issue | `troubleshoot` |
| See all packages | `list-packages` |
| Compare packages | `compare-packages` |

| What You Want | Use This Prompt |
|---------------|-----------------|
| Generate a new feature | `create-feature` |
| Debug a problem | `debug-issue` |
| Optimize code | `optimize-code` |
| Migrate versions | `migration-guide` |

---

## 💡 Pro Tips

### 1. **Combine Tools**
Ask complex questions that use multiple tools:
```
"Show me best practices for authentication and give me a complete example"
→ Uses: get-best-practices + get-example
```

### 2. **Browse by Package**
Filter by specific packages:
```
"Show me all decorators in the ORM package"
→ Uses: search-api with package filter
```

### 3. **Search by Use Case**
Describe what you want to build:
```
"I need to create a microservice that handles payments"
→ Uses: get-example with use case filtering
```

### 4. **Get Context-Aware Help**
Share your code and ask for help:
```
"Here's my code [paste code]. It's not working. Help me debug it."
→ Uses: troubleshoot + search-api
```

---

## 🚀 Getting Started Workflow

1. **Start with list-packages** to see what's available
2. **Use search-api** to find relevant decorators/classes
3. **Use get-example** to see how to use them
4. **Use get-best-practices** to learn the right way
5. **Use troubleshoot** when you hit issues

---

## 📞 Need Help?

- Check the README: `packages/mcp-server/README.md`
- Use MCP Inspector: `bunx @modelcontextprotocol/inspector bun run src/server.ts`
- Ask your AI assistant with MCP connected!

---

## 🎨 Example Sessions

### Session 1: Building a REST API
```
User: "How do I create a REST API in Nael Framework?"
AI: [Uses list-packages to show available packages]
AI: "Let me get you an example..."
AI: [Uses get-example for REST API]
AI: "Here's a complete REST API example..."

User: "What about authentication?"
AI: [Uses get-example for auth]
AI: "Here's how to add JWT authentication..."
```

### Session 2: Debugging an Issue
```
User: "My database connection keeps failing"
AI: [Uses troubleshoot for ORM issues]
AI: "Common causes are..."
AI: [Shows troubleshooting steps]

User: "Still not working"
AI: [Uses search-api to find MongoModule]
AI: "Let me check the configuration..."
```

### Session 3: Learning Best Practices
```
User: "What are security best practices for auth?"
AI: [Uses get-best-practices for auth security]
AI: "Here are 8 security best practices..."

User: "Show me an example of secure password hashing"
AI: [Uses get-example for password handling]
AI: "Here's how to implement secure password hashing..."
```

---

**Happy coding with Nael Framework!** 🚀
