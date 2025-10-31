# BaselHack - Opinion Clustering Platform

An intelligent platform for clustering and analyzing opinions using semantic embeddings and vector database technology.

## 🚀 Features

- **Semantic Opinion Clustering**: Automatically group similar opinions using AI
- **Vector Database**: Persistent storage with ChromaDB for efficient similarity search
- **Real-time Analysis**: Fast clustering with optimal k-selection
- **Project Management**: Organize opinions by projects
- **Semantic Search**: Find similar opinions by meaning, not just keywords
- **Modern UI**: React + TypeScript frontend with Tailwind CSS
- **RESTful API**: FastAPI backend with full API documentation

## 🏗️ Architecture

### Backend
- **FastAPI**: High-performance Python API framework
- **ChromaDB**: Vector database for embedding storage
- **SentenceTransformers**: BAAI/bge-small-en-v1.5 model for embeddings
- **scikit-learn**: K-means clustering with automatic k-selection

### Frontend
- **React + TypeScript**: Type-safe component architecture
- **Vite**: Fast build tooling
- **Tailwind CSS**: Modern utility-first styling
- **shadcn/ui**: Beautiful UI components

## 📦 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
cd BaselHack/code

# Start all services
docker-compose up --build

# Backend API: http://localhost:8000
# Frontend: http://localhost:5173 (if configured)
```

### Manual Setup

#### Backend Setup

```bash
cd code/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py

# API available at http://localhost:8000
```

#### Frontend Setup

```bash
cd code/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Frontend available at http://localhost:5173
```

## 📖 API Documentation

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cluster` | POST | Cluster opinions (in-memory) |
| `/opinions/store` | POST | Store opinions with embeddings |
| `/opinions/cluster-stored` | POST | Cluster stored opinions |
| `/opinions/search` | POST | Semantic similarity search |
| `/db/stats` | GET | Database statistics |

For detailed API documentation, see [Backend API Documentation](./code/backend/API_DOCUMENTATION.md)

## 🧪 Testing

### Backend Tests

```bash
cd code/backend

# Start the server
python main.py

# In another terminal, run tests
python test_vector_db.py
```

### Example Usage

```python
import requests

# Store opinions
response = requests.post('http://localhost:8000/opinions/store', json={
    "opinions": [
        "Great product quality",
        "Excellent customer service",
        "Fast shipping"
    ],
    "project_id": "customer_feedback"
})

# Cluster stored opinions
response = requests.post('http://localhost:8000/opinions/cluster-stored', json={
    "project_id": "customer_feedback"
})

# Search for similar opinions
response = requests.post('http://localhost:8000/opinions/search', json={
    "query": "customer support",
    "n_results": 5
})
```

## 🎯 Use Cases

- **Customer Feedback Analysis**: Group similar customer reviews and comments
- **Survey Response Clustering**: Analyze and categorize open-ended survey responses
- **Content Organization**: Automatically organize and group similar content
- **Sentiment Analysis**: Identify patterns in user opinions
- **Market Research**: Analyze and cluster consumer opinions

## 🔧 Configuration

### Backend Configuration

```bash
# ChromaDB path (optional)
export CHROMA_DB_PATH="./chroma_db"

# API settings
export API_HOST="0.0.0.0"
export API_PORT="8000"
```

### Frontend Configuration

Edit `code/frontend/vite.config.ts` to configure the frontend build settings.

## 📂 Project Structure

```
BaselHack/
├── code/
│   ├── backend/                 # FastAPI backend
│   │   ├── main.py             # API entry point
│   │   ├── routes.py           # API endpoints
│   │   ├── clustering.py       # Clustering logic
│   │   ├── database.py         # Vector database operations
│   │   ├── schemas.py          # Data models
│   │   ├── requirements.txt    # Python dependencies
│   │   ├── Dockerfile          # Docker configuration
│   │   ├── test_vector_db.py   # Test suite
│   │   └── README.md           # Backend documentation
│   ├── frontend/               # React frontend
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── docker-compose.yml      # Docker orchestration
├── documentation/              # Project documentation
├── assets/                     # Project assets
└── README.md                   # This file
```

## 🌟 Key Features Explained

### Vector Database Integration

The platform uses ChromaDB, a vector database optimized for embeddings:

- **Persistent Storage**: Embeddings are computed once and stored
- **Fast Retrieval**: Efficient similarity search across large datasets
- **Project Organization**: Group opinions by project for easy management
- **Semantic Search**: Find opinions by meaning, not just keywords

### Intelligent Clustering

- **Automatic k-selection**: Finds optimal number of clusters (2-6)
- **Silhouette Score**: Quality metric for cluster evaluation
- **Semantic Similarity**: Groups opinions by meaning using embeddings
- **Reproducible**: Consistent results with fixed random seed

## 📊 Performance

- Embedding 100 opinions: ~2 seconds
- Clustering 100 opinions: ~0.5 seconds
- Semantic search: ~0.1 seconds
- Batch storage: ~2.5 seconds for 100 opinions

## 🛠️ Development

### Adding New Features

1. **Backend**: Add endpoints in `routes.py`, logic in `clustering.py` or `database.py`
2. **Frontend**: Add components in `src/components/`, pages in `src/pages/`
3. **Database**: Extend `database.py` for new ChromaDB operations

### Dependencies

Backend dependencies are in `code/backend/requirements.txt`
Frontend dependencies are in `code/frontend/package.json`

## 🐛 Troubleshooting

### Backend Issues

**ChromaDB not initialized**: Ensure `chroma_db` directory is writable
**Out of memory**: Reduce batch size or opinion limit
**Slow embeddings**: Consider GPU acceleration with CUDA-enabled PyTorch

### Frontend Issues

**API connection failed**: Ensure backend is running on port 8000
**Build errors**: Clear node_modules and reinstall dependencies

## 📝 License

See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues or questions:
- Check the [Backend Documentation](./code/backend/README.md)
- Review [API Documentation](./code/backend/API_DOCUMENTATION.md)
- Run test suite for diagnostics

---

Built with ❤️ for BaselHack