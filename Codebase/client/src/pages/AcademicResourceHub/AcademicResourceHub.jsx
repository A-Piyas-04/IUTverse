import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { academicResourceApi } from "../../services/academicResourceApi";
import "./AcademicResourceHub.css";
import Navbar from "../../components/Navbar/Navbar.jsx";

const AcademicResourceHub = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    type: "QUESTION",
    departmentId: "",
    file: null,
    externalLink: "",
  });

  const [newDepartmentName, setNewDepartmentName] = useState("");

  const resourceTypes = [
    { value: "QUESTION", label: "Question Paper" },
    { value: "NOTE", label: "Class Notes" },
    { value: "BOOK", label: "Textbook/Reference" },
    { value: "OTHER", label: "Other" },
  ];

  // Check if user is admin (admin email)
  const isAdmin = user && user.id === 1;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadResources();
  }, [selectedDepartment, selectedType]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, departmentsRes] = await Promise.all([
        academicResourceApi.getResources(),
        academicResourceApi.getDepartments(),
      ]);

      setResources(resourcesRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const filters = {};
      if (selectedDepartment) filters.departmentId = selectedDepartment;
      if (selectedType) filters.type = selectedType;

      const response = await academicResourceApi.getResources(filters);
      setResources(response.data || []);
    } catch (err) {
      setError("Failed to load resources: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      if (!formData.title || !formData.departmentId) {
        setError("Title and department are required");
        return;
      }

      if (!formData.file && !formData.externalLink) {
        setError("Either upload a file or provide an external link");
        return;
      }

      const resourceData = {
        title: formData.title,
        type: formData.type,
        departmentId: formData.departmentId,
        file: formData.file,
        externalLink: formData.externalLink || null,
      };

      if (editingResource) {
        await academicResourceApi.updateResource(
          editingResource.id,
          resourceData
        );
        setSuccess("Resource updated successfully!");
      } else {
        await academicResourceApi.createResource(resourceData);
        setSuccess("Resource uploaded successfully!");
      }

      // Reset form and reload resources
      setFormData({
        title: "",
        type: "QUESTION",
        departmentId: "",
        file: null,
        externalLink: "",
      });
      setShowUploadForm(false);
      setEditingResource(null);
      loadResources();
    } catch (err) {
      setError("Failed to save resource: " + err.message);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      type: resource.type,
      departmentId: resource.departmentId.toString(),
      file: null,
      externalLink: resource.externalLink || "",
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    try {
      setError("");
      await academicResourceApi.deleteResource(resourceId);
      setSuccess("Resource deleted successfully!");
      loadResources();
    } catch (err) {
      setError("Failed to delete resource: " + err.message);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      setError("");
      if (!newDepartmentName.trim()) {
        setError("Department name is required");
        return;
      }

      await academicResourceApi.createDepartment(newDepartmentName.trim());
      setSuccess("Department created successfully!");
      setNewDepartmentName("");
      setShowDepartmentForm(false);

      // Reload departments
      const response = await academicResourceApi.getDepartments();
      setDepartments(response.data || []);
    } catch (err) {
      setError("Failed to create department: " + err.message);
    }
  };

  const filteredResources = resources.filter((resource) =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="academic-hub">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Academic Resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="academic-hub">
      <Navbar />
      <div className="hub-container">
        {/* Header */}
        <div className="hub-header">
          <h1 className="hub-title">📚 Academic Resource Hub</h1>
          <p className="hub-subtitle">
            Upload and access academic materials, question papers, and study
            resources
          </p>
        </div>

        {/* Alert Messages */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn btn-primary"
          >
            {showUploadForm ? "❌ Cancel Upload" : "📤 Upload Resource"}
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowDepartmentForm(!showDepartmentForm)}
              className="btn btn-success"
            >
              {showDepartmentForm ? "❌ Cancel" : "🏛️ Add Department"}
            </button>
          )}
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="form-card">
            <h2 className="form-title">
              {editingResource ? "✏️ Edit Resource" : "📤 Upload New Resource"}
            </h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="form-input"
                  placeholder="e.g., Digital Logic Midterm 2024"
                  required
                />
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="form-select"
                  >
                    {resourceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) =>
                      setFormData({ ...formData, departmentId: e.target.value })
                    }
                    className="form-select"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">📄 Upload PDF File</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setFormData({ ...formData, file: e.target.files[0] })
                  }
                  className="form-file"
                />
                <p className="form-help">Maximum file size: 10MB</p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  🔗 External Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.externalLink}
                  onChange={(e) =>
                    setFormData({ ...formData, externalLink: e.target.value })
                  }
                  className="form-input"
                  placeholder="https://drive.google.com/file/d/..."
                />
                <p className="form-help">
                  Google Drive, Docs, or other external links
                </p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingResource
                    ? "✅ Update Resource"
                    : "📤 Upload Resource"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setEditingResource(null);
                    setFormData({
                      title: "",
                      type: "QUESTION",
                      departmentId: "",
                      file: null,
                      externalLink: "",
                    });
                  }}
                  className="btn btn-secondary"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Department Form */}
        {showDepartmentForm && isAdmin && (
          <div className="form-card">
            <h2 className="form-title">🏛️ Add New Department</h2>
            <form onSubmit={handleCreateDepartment} className="form-grid">
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Computer Science and Engineering"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  ✅ Create Department
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDepartmentForm(false);
                    setNewDepartmentName("");
                  }}
                  className="btn btn-secondary"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters and Search */}
        <div className="filter-card">
          <h2 className="filter-title">🔍 Filter Resources</h2>
          <div className="filter-grid">
            <div className="form-group">
              <label className="form-label">🔎 Search by Title</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                placeholder="Search resources..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">🏛️ Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="form-select"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">📋 Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="form-select"
              >
                <option value="">All Types</option>
                {resourceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="resources-grid">
          {filteredResources.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3 className="empty-title">No resources found</h3>
              <p className="empty-subtitle">
                Try adjusting your search or upload a new resource
              </p>
            </div>
          ) : (
            filteredResources.map((resource) => (
              <div key={resource.id} className="resource-card">
                <div className="resource-header">
                  <h3 className="resource-title">{resource.title}</h3>
                  {isAdmin && (
                    <div className="resource-actions">
                      <button
                        onClick={() => handleEdit(resource)}
                        className="action-btn action-btn-edit"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="action-btn action-btn-delete"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="resource-meta">
                  <div className="meta-item">
                    <span className="meta-label">🏛️ Department:</span>
                    <span>{resource.department?.name}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">📋 Type:</span>
                    <span>
                      {
                        resourceTypes.find((t) => t.value === resource.type)
                          ?.label
                      }
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">📅 Uploaded:</span>
                    <span>
                      {new Date(resource.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="resource-links">
                  {resource.fileUrl && (
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link resource-link-pdf"
                    >
                      📄 View PDF
                    </a>
                  )}
                  {resource.externalLink && (
                    <a
                      href={resource.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link resource-link-external"
                    >
                      🔗 External Link
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicResourceHub;
