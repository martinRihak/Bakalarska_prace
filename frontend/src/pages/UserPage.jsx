import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiService";
import UserBar from "@/components/layout/UserBar";
import "@css/UserPage.css";

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role: "user",
  });
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userSensors, setUserSensors] = useState({});
  const [loadingSensorsUserId, setLoadingSensorsUserId] = useState(null);
  const [editingSensorKey, setEditingSensorKey] = useState(null);
  const [sensorEditForm, setSensorEditForm] = useState({
    name: "",
    sensor_type: "",
    unit: "",
    sampling_rate: "",
    is_active: true,
  });
  const [savingSensorKey, setSavingSensorKey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.getAllUsers();
        setUsers(response);
      } catch (err) {
        setError(err.message || "Nepodařilo se načíst uživatele");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const startEdit = (user) => {
    setActionError("");
    setEditingUserId(user.user_id);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm({
      username: "",
      email: "",
      role: "user",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveUser = async (userId) => {
    setActionError("");
    setSaving(true);
    try {
      const response = await api.updateUser(userId, editForm);
      setUsers((prev) =>
        prev.map((user) => (user.user_id === userId ? response.user : user)),
      );
      cancelEdit();
    } catch (err) {
      setActionError(err.message || "Nepodařilo se upravit uživatele");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId) => {
    const sure = window.confirm("Opravdu chcete smazat tohoto uživatele?");
    if (!sure) return;

    setActionError("");
    setDeletingUserId(userId);
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.user_id !== userId));
    } catch (err) {
      setActionError(err.message || "Nepodařilo se smazat uživatele");
    } finally {
      setDeletingUserId(null);
    }
  };

  const toggleUserSensors = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);
    if (userSensors[userId]) return;

    setLoadingSensorsUserId(userId);
    setActionError("");
    try {
      const sensors = await api.getSensorsForUser(userId);
      setUserSensors((prev) => ({ ...prev, [userId]: sensors }));
    } catch (err) {
      setActionError(err.message || "Nepodařilo se načíst senzory uživatele");
    } finally {
      setLoadingSensorsUserId(null);
    }
  };

  const startSensorEdit = (userId, sensor) => {
    setActionError("");
    setEditingSensorKey(`${userId}-${sensor.sensor_id}`);
    setSensorEditForm({
      name: sensor.name || "",
      sensor_type: sensor.sensor_type || "",
      unit: sensor.unit || "",
      sampling_rate: sensor.sampling_rate ?? "",
      is_active: Boolean(sensor.is_active),
    });
  };

  const cancelSensorEdit = () => {
    setEditingSensorKey(null);
    setSensorEditForm({
      name: "",
      sensor_type: "",
      unit: "",
      sampling_rate: "",
      is_active: true,
    });
  };

  const handleSensorEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSensorEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveUserSensor = async (userId, sensorId) => {
    const key = `${userId}-${sensorId}`;
    setSavingSensorKey(key);
    setActionError("");
    try {
      const response = await api.updateSensorForUser(userId, sensorId, {
        ...sensorEditForm,
        sampling_rate: Number(sensorEditForm.sampling_rate),
      });
      setUserSensors((prev) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((sensor) =>
          sensor.sensor_id === sensorId ? response.sensor : sensor,
        ),
      }));
      cancelSensorEdit();
    } catch (err) {
      setActionError(err.message || "Nepodařilo se upravit senzor");
    } finally {
      setSavingSensorKey(null);
    }
  };

  return (
    <div className="main">
      <UserBar />
      <main className="page-shell">
        <section className="main-content users-page">
          <h1>Uživatelé</h1>

          {loading && <div>Načítání uživatelů...</div>}
          {!loading && error && <div className="error-message">{error}</div>}
          {!loading && !error && actionError && (
            <div className="error-message">{actionError}</div>
          )}

          {!loading && !error && (
            <>
              <div className="users-toolbar">
                <button
                  className="create-user-btn"
                  onClick={() => navigate("/insertUser")}
                >
                  Vytvořit uživatele
                </button>
              </div>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Uživatelské jméno</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Vytvořen</th>
                    <th>Poslední přihlášení</th>
                    <th>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isEditing = editingUserId === user.user_id;
                    const isExpanded = expandedUserId === user.user_id;
                    const sensorsForUser = userSensors[user.user_id] || [];

                    return (
                      <React.Fragment key={user.user_id}>
                        <tr
                          className={`user-row ${isExpanded ? "expanded" : ""}`}
                          onClick={() => toggleUserSensors(user.user_id)}
                        >
                          <td>{user.user_id}</td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="username"
                                value={editForm.username}
                                onChange={handleEditChange}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              user.username
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="email"
                                type="email"
                                value={editForm.email}
                                onChange={handleEditChange}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              user.email
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                className="table-input"
                                name="role"
                                value={editForm.role}
                                onChange={handleEditChange}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              user.role
                            )}
                          </td>
                          <td>
                            {user.created_at
                              ? new Date(user.created_at).toLocaleString()
                              : "-"}
                          </td>
                          <td>
                            {user.last_login
                              ? new Date(user.last_login).toLocaleString()
                              : "-"}
                          </td>
                          <td
                            className="user-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isEditing ? (
                              <>
                                <button
                                  className="user-btn save-btn"
                                  onClick={() => saveUser(user.user_id)}
                                  disabled={saving}
                                >
                                  Uložit
                                </button>
                                <button
                                  className="user-btn cancel-btn"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  Zrušit
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="user-btn edit-btn"
                                  onClick={() => startEdit(user)}
                                >
                                  Upravit
                                </button>
                                <button
                                  className="user-btn delete-btn"
                                  onClick={() => deleteUser(user.user_id)}
                                  disabled={deletingUserId === user.user_id}
                                >
                                  {deletingUserId === user.user_id
                                    ? "Mazání..."
                                    : "Smazat"}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="sensor-row-wrapper">
                            <td colSpan={7}>
                              {loadingSensorsUserId === user.user_id ? (
                                <div className="sensor-loading">
                                  Načítání senzorů...
                                </div>
                              ) : sensorsForUser.length === 0 ? (
                                <div className="sensor-loading">
                                  Uživatel nemá žádné senzory.
                                </div>
                              ) : (
                                <table className="sensor-subtable">
                                  <thead>
                                    <tr>
                                      <th>ID</th>
                                      <th>Název</th>
                                      <th>Typ</th>
                                      <th>Jednotka</th>
                                      <th>Sampling</th>
                                      <th>Aktivní</th>
                                      <th>Akce</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sensorsForUser.map((sensor) => {
                                      const sensorKey = `${user.user_id}-${sensor.sensor_id}`;
                                      const isEditingSensor =
                                        editingSensorKey === sensorKey;
                                      return (
                                        <tr key={sensor.sensor_id}>
                                          <td>{sensor.sensor_id}</td>
                                          <td>
                                            {isEditingSensor ? (
                                              <input
                                                className="table-input"
                                                name="name"
                                                value={sensorEditForm.name}
                                                onChange={
                                                  handleSensorEditChange
                                                }
                                              />
                                            ) : (
                                              sensor.name
                                            )}
                                          </td>
                                          <td>
                                            {isEditingSensor ? (
                                              <input
                                                className="table-input"
                                                name="sensor_type"
                                                value={
                                                  sensorEditForm.sensor_type
                                                }
                                                onChange={
                                                  handleSensorEditChange
                                                }
                                              />
                                            ) : (
                                              sensor.sensor_type
                                            )}
                                          </td>
                                          <td>
                                            {isEditingSensor ? (
                                              <input
                                                className="table-input"
                                                name="unit"
                                                value={sensorEditForm.unit}
                                                onChange={
                                                  handleSensorEditChange
                                                }
                                              />
                                            ) : (
                                              sensor.unit
                                            )}
                                          </td>
                                          <td>
                                            {isEditingSensor ? (
                                              <input
                                                className="table-input"
                                                name="sampling_rate"
                                                type="number"
                                                value={
                                                  sensorEditForm.sampling_rate
                                                }
                                                onChange={
                                                  handleSensorEditChange
                                                }
                                              />
                                            ) : (
                                              sensor.sampling_rate
                                            )}
                                          </td>
                                          <td>
                                            {isEditingSensor ? (
                                              <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={
                                                  sensorEditForm.is_active
                                                }
                                                onChange={
                                                  handleSensorEditChange
                                                }
                                              />
                                            ) : sensor.is_active ? (
                                              "Ano"
                                            ) : (
                                              "Ne"
                                            )}
                                          </td>
                                          <td className="user-actions">
                                            {isEditingSensor ? (
                                              <>
                                                <button
                                                  className="user-btn save-btn"
                                                  onClick={() =>
                                                    saveUserSensor(
                                                      user.user_id,
                                                      sensor.sensor_id,
                                                    )
                                                  }
                                                  disabled={
                                                    savingSensorKey ===
                                                    sensorKey
                                                  }
                                                >
                                                  Uložit
                                                </button>
                                                <button
                                                  className="user-btn cancel-btn"
                                                  onClick={cancelSensorEdit}
                                                >
                                                  Zrušit
                                                </button>
                                              </>
                                            ) : (
                                              <button
                                                className="user-btn edit-btn"
                                                onClick={() =>
                                                  startSensorEdit(
                                                    user.user_id,
                                                    sensor,
                                                  )
                                                }
                                              >
                                                Upravit
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserPage;
