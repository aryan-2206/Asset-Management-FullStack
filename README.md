# Asset Management System (Full Stack)

## 📌 Overview
The **Asset Management System** is a full-stack web application designed to efficiently manage, track, and maintain organizational assets through a centralized platform. The project provides a clean and intuitive user interface backed by a robust Python backend, enabling structured asset handling, data persistence, and file uploads. It is suitable for academic projects as well as small to medium-scale organizational use.

---

## 🎯 Objectives
- Centralize asset information in a structured manner
- Enable easy creation, updating, and tracking of assets
- Provide a responsive frontend with smooth user interaction
- Maintain clean separation between frontend and backend
- Follow best practices for project structure and version control

---

## 🧱 Project Structure

```text
ASSET_MANAGEMENT/
├── frontend/
│   ├── src/
│   ├── node_modules/        # ignored
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── uploads/                # ignored (generated files)
├── .venv/                  # ignored (virtual environment)
├── backend.py
├── app.html
├── appupdate.html
├── assetflow.db            # ignored (database file)
├── .gitignore
└── README.md
```

## 🖥️ Frontend
- Built using **React with Vite**
- Component-based architecture for better reusability
- Fast development and build process
- Clean and responsive UI for asset interaction

The frontend communicates with the backend to fetch, update, and display asset-related data efficiently.

---

## ⚙️ Backend
- Developed in **Python**
- Handles business logic and data processing
- Manages asset records and file uploads
- Interacts with a lightweight **SQLite database** for data persistence

---

## 🗄️ Database
- **SQLite** is used for simplicity and ease of setup
- Stores structured asset data
- Database file is excluded from version control to maintain security and cleanliness

---

## 🛠️ Tech Stack

| Category | Technologies |
|--------|--------------|
| 🎨 **Frontend** | ⚛️ React &nbsp;•&nbsp; ⚡ Vite &nbsp;•&nbsp; 🟨 JavaScript &nbsp;•&nbsp; 🌐 HTML &nbsp;•&nbsp; 🎨 CSS |
| ⚙️ **Backend** | 🐍 Python |
| 🗄️ **Database** | 🧩 SQLite |
| 🧰 **Tools & Utilities** | 🧑‍💻 Git &nbsp;•&nbsp; 🌍 GitHub &nbsp;•&nbsp; 🧪 Virtual Environment (venv) |

---

## 🚀 Setup Instructions

### 1️⃣ Clone the repository
```
git clone https://github.com/aryan-2206/Asset-Management-FullStack.git  
cd Asset-Management-FullStack
```
### 2️⃣ Frontend setup
```
cd frontend  
npm install  
npm run dev
```
### 3️⃣ Backend setup
```
python -m venv .venv  
source .venv/bin/activate   (Windows: .venv\Scripts\activate)  
python backend.py
```
---

## 🔒 Version Control Practices
The following files and folders are excluded using `.gitignore`:
- node_modules/
- .venv/
- assetflow.db
- uploads/
- Environment files

---

## 📈 Future Enhancements
- User authentication and authorization
- Role-based access control
- Asset analytics and reporting dashboard
- REST API separation
- Cloud deployment
- Improved UI/UX design

---

## 📚 Learning Outcomes
- Full-stack application development
- Frontend–backend integration
- Database handling and file management
- Git and GitHub best practices
- Project structuring and scalability considerations

---

## 👤 Author
Aryan Doshi
