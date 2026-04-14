import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiService";
import UserBar from "@/components/layout/UserBar";
import "@css/UserPage.css";
import "@css/buttons.css";

const AdminPage = () => {
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
  const [addSensorUserId, setAddSensorUserId] = useState(null);
  const [addSensorMode, setAddSensorMode] = useState(null); // "create" | "existing"
  const [newSensorForm, setNewSensorForm] = useState({
    name: "",
    sensor_type: "",
    unit: "",
    address: 0,
    functioncode: 0,
    bit: 16,
    scaling: 1,
    sampling_rate: 60,
    min_value: "",
    max_value: "",
  });
  const [existingSensorId, setExistingSensorId] = useState("");
  const [allSensors, setAllSensors] = useState([]);
  const [addingSensor, setAddingSensor] = useState(false);
  const [allSystemSensors, setAllSystemSensors] = useState([]);
  const [systemSensorsLoading, setSystemSensorsLoading] = useState(false);
  const [systemSensorsError, setSystemSensorsError] = useState("");
  const [editingSystemSensorId, setEditingSystemSensorId] = useState(null);
  const [systemSensorEditForm, setSystemSensorEditForm] = useState({});
  const [savingSystemSensorId, setSavingSystemSensorId] = useState(null);
  const navigate = useNavigate();

  const currentUser = api.getCurrentUser();

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

    if (currentUser?.role === "admin") {
      setSystemSensorsLoading(true);
      api
        .getAllSensors()
        .then(setAllSystemSensors)
        .catch((err) =>
          setSystemSensorsError(err.message || "Nepodařilo se načíst senzory"),
        )
        .finally(() => setSystemSensorsLoading(false));
    }
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

  const openAddSensor = async (userId, mode) => {
    setAddSensorUserId(userId);
    setAddSensorMode(mode);
    setActionError("");
    if (mode === "existing" && allSensors.length === 0) {
      try {
        const sensors = await api.getAvailableSensors();
        setAllSensors(sensors);
      } catch (err) {
        setActionError(err.message || "Nepodařilo se načíst dostupné senzory");
      }
    }
  };

  const closeAddSensor = () => {
    setAddSensorUserId(null);
    setAddSensorMode(null);
    setNewSensorForm({
      name: "",
      sensor_type: "",
      unit: "",
      address: 0,
      functioncode: 0,
      bit: 16,
      scaling: 1,
      sampling_rate: 60,
      min_value: "",
      max_value: "",
    });
    setExistingSensorId("");
  };

  const handleNewSensorChange = (e) => {
    const { name, value, type } = e.target;
    setNewSensorForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const submitCreateSensor = async (userId) => {
    setAddingSensor(true);
    setActionError("");
    try {
      const payload = {
        ...newSensorForm,
        min_value:
          newSensorForm.min_value === ""
            ? null
            : Number(newSensorForm.min_value),
        max_value:
          newSensorForm.max_value === ""
            ? null
            : Number(newSensorForm.max_value),
      };
      const response = await api.createSensorForUser(userId, payload);
      setUserSensors((prev) => ({
        ...prev,
        [userId]: [...(prev[userId] || []), response.sensor],
      }));
      closeAddSensor();
    } catch (err) {
      setActionError(err.message || "Nepodařilo se vytvořit senzor");
    } finally {
      setAddingSensor(false);
    }
  };

  const submitAddExistingSensor = async (userId) => {
    if (!existingSensorId) return;
    setAddingSensor(true);
    setActionError("");
    try {
      const response = await api.addExistingSensorToUser(
        userId,
        Number(existingSensorId),
      );
      setUserSensors((prev) => ({
        ...prev,
        [userId]: [...(prev[userId] || []), response.sensor],
      }));
      closeAddSensor();
    } catch (err) {
      setActionError(err.message || "Nepodařilo se přidat senzor");
    } finally {
      setAddingSensor(false);
    }
  };

  const startSystemSensorEdit = (sensor) => {
    setSystemSensorsError("");
    setEditingSystemSensorId(sensor.sensor_id);
    setSystemSensorEditForm({
      name: sensor.name || "",
      sensor_type: sensor.sensor_type || "",
      unit: sensor.unit || "",
      address: sensor.address ?? 0,
      functioncode: sensor.functioncode ?? 0,
      bit: sensor.bit ?? 16,
      scaling: sensor.scaling ?? 1,
      sampling_rate: sensor.sampling_rate ?? 60,
      min_value: sensor.min_value ?? "",
      max_value: sensor.max_value ?? "",
      is_active: Boolean(sensor.is_active),
    });
  };

  const cancelSystemSensorEdit = () => {
    setEditingSystemSensorId(null);
    setSystemSensorEditForm({});
  };

  const handleSystemSensorEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystemSensorEditForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? value === ""
              ? ""
              : Number(value)
            : value,
    }));
  };

  const saveSystemSensor = async (sensorId) => {
    setSavingSystemSensorId(sensorId);
    setSystemSensorsError("");
    try {
      await api.updateSensor({ sensor_id: sensorId, ...systemSensorEditForm });
      setAllSystemSensors((prev) =>
        prev.map((s) =>
          s.sensor_id === sensorId ? { ...s, ...systemSensorEditForm } : s,
        ),
      );
      cancelSystemSensorEdit();
    } catch (err) {
      setSystemSensorsError(err.message || "Nepodařilo se upravit senzor");
    } finally {
      setSavingSystemSensorId(null);
    }
  };

  const deleteSystemSensor = async (sensorId) => {
    if (
      !window.confirm(
        "Opravdu chcete trvale smazat tento senzor? Tato akce nelze vrátit.",
      )
    )
      return;
    setSystemSensorsError("");
    try {
      await api.deleteSensor(sensorId);
      setAllSystemSensors((prev) =>
        prev.filter((s) => s.sensor_id !== sensorId),
      );
    } catch (err) {
      setSystemSensorsError(err.message || "Nepodařilo se smazat senzor");
    }
  };
  const handleDeleteSensor = async (sensorId) => {
    if (window.confirm("Opravdu chcete smazat tento senzor?")) {
      try {
        await api.deleteUserSensor(sensorId);
        setUserSensors((prevSensors) =>
          prevSensors.filter((sensor) => sensor.sensor_id !== sensorId),
        );
      } catch (err) {
        setError(err.message);
      }
    }
  };
  return (
    <div className="main">
      <UserBar />
      <main className="page-shell">
        <section className="main-content users-page">
          {loading && <div>Načítání uživatelů...</div>}
          {!loading && error && <div className="error-message">{error}</div>}
          {!loading && !error && actionError && (
            <div className="error-message">{actionError}</div>
          )}

          {!loading && !error && (
            <>
              <div className="users-toolbar">
                <h2>Uživatelé v systému</h2>
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
                                <div>
                                  <div className="sensor-loading">
                                    Uživatel nemá žádné senzory.
                                  </div>
                                  <div
                                    className="sensor-add-actions"
                                    style={{
                                      marginTop: "0.5rem",
                                      display: "flex",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    <button
                                      className="user-btn edit-btn"
                                      onClick={() =>
                                        openAddSensor(user.user_id, "create")
                                      }
                                    >
                                      Vytvořit nový senzor
                                    </button>
                                    <button
                                      className="user-btn edit-btn"
                                      onClick={() =>
                                        openAddSensor(user.user_id, "existing")
                                      }
                                    >
                                      Přidat existující senzor
                                    </button>
                                  </div>
                                  {addSensorUserId === user.user_id &&
                                    addSensorMode === "create" && (
                                      <div
                                        className="sensor-add-form"
                                        style={{
                                          marginTop: "0.5rem",
                                          padding: "0.75rem",
                                          border:
                                            "1px solid var(--border-color, #ccc)",
                                          borderRadius: "6px",
                                        }}
                                      >
                                        <h4>Nový senzor</h4>
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          <label>
                                            Název
                                            <input
                                              className="table-input"
                                              name="name"
                                              value={newSensorForm.name}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Typ
                                            <input
                                              className="table-input"
                                              name="sensor_type"
                                              value={newSensorForm.sensor_type}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Jednotka
                                            <input
                                              className="table-input"
                                              name="unit"
                                              value={newSensorForm.unit}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Adresa
                                            <input
                                              className="table-input"
                                              name="address"
                                              type="number"
                                              value={newSensorForm.address}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Function code
                                            <input
                                              className="table-input"
                                              name="functioncode"
                                              type="number"
                                              value={newSensorForm.functioncode}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Bit
                                            <input
                                              className="table-input"
                                              name="bit"
                                              type="number"
                                              value={newSensorForm.bit}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Scaling
                                            <input
                                              className="table-input"
                                              name="scaling"
                                              type="number"
                                              value={newSensorForm.scaling}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Sampling rate
                                            <input
                                              className="table-input"
                                              name="sampling_rate"
                                              type="number"
                                              value={
                                                newSensorForm.sampling_rate
                                              }
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Min value
                                            <input
                                              className="table-input"
                                              name="min_value"
                                              type="number"
                                              value={newSensorForm.min_value}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Max value
                                            <input
                                              className="table-input"
                                              name="max_value"
                                              type="number"
                                              value={newSensorForm.max_value}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                        </div>
                                        <div
                                          style={{
                                            marginTop: "0.5rem",
                                            display: "flex",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          <button
                                            className="user-btn save-btn"
                                            onClick={() =>
                                              submitCreateSensor(user.user_id)
                                            }
                                            disabled={addingSensor}
                                          >
                                            {addingSensor
                                              ? "Ukládání..."
                                              : "Vytvořit"}
                                          </button>
                                          <button
                                            className="user-btn cancel-btn"
                                            onClick={closeAddSensor}
                                            disabled={addingSensor}
                                          >
                                            Zrušit
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  {addSensorUserId === user.user_id &&
                                    addSensorMode === "existing" && (
                                      <div
                                        className="sensor-add-form"
                                        style={{
                                          marginTop: "0.5rem",
                                          padding: "0.75rem",
                                          border:
                                            "1px solid var(--border-color, #ccc)",
                                          borderRadius: "6px",
                                        }}
                                      >
                                        <h4>Přidat existující senzor</h4>
                                        <select
                                          className="table-input"
                                          value={existingSensorId}
                                          onChange={(e) =>
                                            setExistingSensorId(e.target.value)
                                          }
                                          style={{
                                            width: "100%",
                                            marginBottom: "0.5rem",
                                          }}
                                        >
                                          <option value="">
                                            -- Vyberte senzor --
                                          </option>
                                          {allSensors.map((s) => (
                                            <option
                                              key={s.sensor_id}
                                              value={s.sensor_id}
                                            >
                                              {s.sensor_id} - {s.name} (
                                              {s.sensor_type})
                                            </option>
                                          ))}
                                        </select>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          <button
                                            className="user-btn save-btn"
                                            onClick={() =>
                                              submitAddExistingSensor(
                                                user.user_id,
                                              )
                                            }
                                            disabled={
                                              addingSensor || !existingSensorId
                                            }
                                          >
                                            {addingSensor
                                              ? "Přidávání..."
                                              : "Přidat"}
                                          </button>
                                          <button
                                            className="user-btn cancel-btn"
                                            onClick={closeAddSensor}
                                            disabled={addingSensor}
                                          >
                                            Zrušit
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <>
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
                                                <>
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
                                                  <button
                                                    className="user-btn delete-btn"
                                                    onClick={() => handleDeleteSensor(sensor.sensor_id)}
                                                  >
                                                    Smazat
                                                  </button>
                                                </>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  <div
                                    className="sensor-add-actions"
                                    style={{
                                      marginTop: "0.5rem",
                                      display: "flex",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    <button
                                      className="user-btn edit-btn"
                                      onClick={() =>
                                        openAddSensor(user.user_id, "create")
                                      }
                                    >
                                      Vytvořit nový senzor
                                    </button>
                                    <button
                                      className="user-btn edit-btn"
                                      onClick={() =>
                                        openAddSensor(user.user_id, "existing")
                                      }
                                    >
                                      Přidat existující senzor
                                    </button>
                                  </div>
                                  {addSensorUserId === user.user_id &&
                                    addSensorMode === "create" && (
                                      <div
                                        className="sensor-add-form"
                                        style={{
                                          marginTop: "0.5rem",
                                          padding: "0.75rem",
                                          border:
                                            "1px solid var(--border-color, #ccc)",
                                          borderRadius: "6px",
                                        }}
                                      >
                                        <h4>Nový senzor</h4>
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          <label>
                                            Název
                                            <input
                                              className="table-input"
                                              name="name"
                                              value={newSensorForm.name}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Typ
                                            <input
                                              className="table-input"
                                              name="sensor_type"
                                              value={newSensorForm.sensor_type}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Jednotka
                                            <input
                                              className="table-input"
                                              name="unit"
                                              value={newSensorForm.unit}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Adresa
                                            <input
                                              className="table-input"
                                              name="address"
                                              type="number"
                                              value={newSensorForm.address}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Function code
                                            <input
                                              className="table-input"
                                              name="functioncode"
                                              type="number"
                                              value={newSensorForm.functioncode}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Bit
                                            <input
                                              className="table-input"
                                              name="bit"
                                              type="number"
                                              value={newSensorForm.bit}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Scaling
                                            <input
                                              className="table-input"
                                              name="scaling"
                                              type="number"
                                              value={newSensorForm.scaling}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Sampling rate
                                            <input
                                              className="table-input"
                                              name="sampling_rate"
                                              type="number"
                                              value={
                                                newSensorForm.sampling_rate
                                              }
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Min value
                                            <input
                                              className="table-input"
                                              name="min_value"
                                              type="number"
                                              value={newSensorForm.min_value}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                          <label>
                                            Max value
                                            <input
                                              className="table-input"
                                              name="max_value"
                                              type="number"
                                              value={newSensorForm.max_value}
                                              onChange={handleNewSensorChange}
                                            />
                                          </label>
                                        </div>
                                        <div
                                          style={{
                                            marginTop: "0.5rem",
                                            display: "flex",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          <button
                                            className="user-btn save-btn"
                                            onClick={() =>
                                              submitCreateSensor(user.user_id)
                                            }
                                            disabled={addingSensor}
                                          >
                                            {addingSensor
                                              ? "Ukládání..."
                                              : "Vytvořit"}
                                          </button>
                                          <button
                                            className="user-btn cancel-btn"
                                            onClick={closeAddSensor}
                                            disabled={addingSensor}
                                          >
                                            Zrušit
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  {addSensorUserId === user.user_id &&
                                    addSensorMode === "existing" && (
                                      <div
                                        className="sensor-add-form"
                                        style={{
                                          marginTop: "0.5rem",
                                          padding: "0.75rem",
                                          border:
                                            "1px solid var(--border-color, #ccc)",
                                          borderRadius: "6px",
                                        }}
                                      >
                                        <h4>Přidat existující senzor</h4>
                                        <select
                                          className="table-input"
                                          value={existingSensorId}
                                          onChange={(e) =>
                                            setExistingSensorId(e.target.value)
                                          }
                                          style={{
                                            width: "100%",
                                            marginBottom: "0.5rem",
                                          }}
                                        >
                                          <option value="">
                                            -- Vyberte senzor --
                                          </option>
                                          {allSensors.map((s) => (
                                            <option
                                              key={s.sensor_id}
                                              value={s.sensor_id}
                                            >
                                              {s.sensor_id} - {s.name} (
                                              {s.sensor_type})
                                            </option>
                                          ))}
                                        </select>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          <button
                                            className="user-btn save-btn"
                                            onClick={() =>
                                              submitAddExistingSensor(
                                                user.user_id,
                                              )
                                            }
                                            disabled={
                                              addingSensor || !existingSensorId
                                            }
                                          >
                                            {addingSensor
                                              ? "Přidávání..."
                                              : "Přidat"}
                                          </button>
                                          <button
                                            className="user-btn cancel-btn"
                                            onClick={closeAddSensor}
                                            disabled={addingSensor}
                                          >
                                            Zrušit
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                </>
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
          {currentUser?.role === "admin" && (
            <section style={{ marginTop: "2rem" }}>
              <h2>Všechny senzory v systému</h2>
              {systemSensorsError && (
                <div className="error-message">{systemSensorsError}</div>
              )}
              {systemSensorsLoading ? (
                <div>Načítání senzorů...</div>
              ) : (
                <table className="sensor-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Název</th>
                      <th>Typ</th>
                      <th>Jednotka</th>
                      <th>Adresa</th>
                      <th>Sampling</th>
                      <th>Aktivní</th>
                      <th>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSystemSensors.map((sensor) => {
                      const isEditing =
                        editingSystemSensorId === sensor.sensor_id;
                      return (
                        <tr key={sensor.sensor_id}>
                          <td>{sensor.sensor_id}</td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="name"
                                value={systemSensorEditForm.name}
                                onChange={handleSystemSensorEditChange}
                              />
                            ) : (
                              sensor.name
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="sensor_type"
                                value={systemSensorEditForm.sensor_type}
                                onChange={handleSystemSensorEditChange}
                              />
                            ) : (
                              sensor.sensor_type
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="unit"
                                value={systemSensorEditForm.unit}
                                onChange={handleSystemSensorEditChange}
                              />
                            ) : (
                              sensor.unit
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="address"
                                type="number"
                                value={systemSensorEditForm.address}
                                onChange={handleSystemSensorEditChange}
                              />
                            ) : (
                              sensor.address
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="table-input"
                                name="sampling_rate"
                                type="number"
                                value={systemSensorEditForm.sampling_rate}
                                onChange={handleSystemSensorEditChange}
                              />
                            ) : (
                              sensor.sampling_rate
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="checkbox"
                                name="is_active"
                                checked={systemSensorEditForm.is_active}
                                onChange={handleSystemSensorEditChange}
                              />
                            ) : sensor.is_active ? (
                              "Ano"
                            ) : (
                              "Ne"
                            )}
                          </td>
                          <td className="user-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="user-btn save-btn"
                                  onClick={() =>
                                    saveSystemSensor(sensor.sensor_id)
                                  }
                                  disabled={
                                    savingSystemSensorId === sensor.sensor_id
                                  }
                                >
                                  Uložit
                                </button>
                                <button
                                  className="user-btn cancel-btn"
                                  onClick={cancelSystemSensorEdit}
                                >
                                  Zrušit
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="user-btn edit-btn"
                                  onClick={() => startSystemSensorEdit(sensor)}
                                >
                                  Upravit
                                </button>
                                <button
                                  className="user-btn delete-btn"
                                  onClick={() =>
                                    deleteSystemSensor(sensor.sensor_id)
                                  }
                                >
                                  Smazat
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
