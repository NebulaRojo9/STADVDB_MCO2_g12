import React, { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Book,
  Terminal,
  Database,
} from "lucide-react";

const generateUniqueId = () => {
  // Generate a random number between 0 and 99,999,999
  const randomNum = Math.floor(Math.random() * 100000000);

  // Pad it with zeros so it is ALWAYS 8 digits long (e.g., 5 becomes 00000005)
  const eightDigits = String(randomNum).padStart(8, "0");

  return `tt${eightDigits}`;
};

// Backend API base URL. test
// For dev, point this to the node paired with this frontend instance, e.g.:
//   VITE_API_BASE_URL=http://localhost:3000  (Node 0 webapp)
//   VITE_API_BASE_URL=http://localhost:3001  (Node 1 webapp)
//   VITE_API_BASE_URL=http://localhost:3002  (Node 2 webapp)
// In production you can serve the frontend behind the same origin as the backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const TAB_KEYS = ["User", "Node 0", "Node 1", "Node 2"];

export default function MovieDatabaseApp() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("User"); // 'User', 'Node 0', 'Node 1', 'Node 2'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Increased to 10 rows

  // --- Initial Data Sets (Input Part) ---

  // Store all lists in a single state object
  const [allMovies, setAllMovies] = useState({
    User: [],
    "Node 0": [],
    "Node 1": [],
    "Node 2": [],
  });

  // Transform backend data format to frontend format
  const transformBackendData = (backendData) => {
    if (!Array.isArray(backendData)) return [];
    return backendData.map((item, index) => ({
      id: item.tconst || `temp-${index}`, // Use tconst as id, or generate temp id
      titleType: item.titleType || "",
      primaryTitle: item.primaryTitle || "",
      originalTitle: item.originalTitle || "",
      isAdult: Boolean(item.isAdult),
      startYear: item.startYear || "",
      endYear: item.endYear || "",
      runtime: item.runtimeMinutes || item.runtime || "",
      genres: item.genres || "",
    }));
  };

  // Transform frontend data format to backend format
  const transformFrontendToBackend = (frontendData) => {
    const startYear = frontendData.startYear
      ? parseInt(frontendData.startYear, 10)
      : null;
    const endYear =
      frontendData.endYear && frontendData.endYear !== ""
        ? parseInt(frontendData.endYear, 10)
        : null;
    const runtimeMinutes =
      frontendData.runtime && frontendData.runtime !== ""
        ? parseInt(frontendData.runtime, 10)
        : null;

    return {
      tconst: frontendData.id || frontendData.tconst || generateUniqueId(), // Use id as tconst, or generate
      titleType: frontendData.titleType || "",
      primaryTitle: frontendData.primaryTitle || "",
      originalTitle: frontendData.originalTitle || "",
      isAdult: !!frontendData.isAdult,
      startYear: startYear && !isNaN(startYear) ? startYear : null,
      endYear: endYear && !isNaN(endYear) ? endYear : null,
      runtimeMinutes:
        runtimeMinutes && !isNaN(runtimeMinutes) ? runtimeMinutes : null,
      genres: frontendData.genres || "",
    };
  };

  // Fetch data from backend
  // Transparency: the frontend always talks to its *local* node using the logical
  // `readAll` endpoint. The backend is responsible for fragmentation and
  // aggregation across nodes, so the UI does not need to know which node it is on.
  const fetchDataFromBackend = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/title-basics/readAll`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const fetchedData = await response.json();
      const transformedData = transformBackendData(fetchedData);

      // Same global logical view for all tabs; node details are hidden.
      setAllMovies({
        User: transformedData,
        "Node 0": transformedData,
        "Node 1": transformedData,
        "Node 2": transformedData,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      setAllMovies({
        User: [],
        "Node 0": [],
        "Node 1": [],
        "Node 2": [],
      });
    }
  }, []);

  const refreshAllTabs = useCallback(async () => {
    await fetchDataFromBackend();
  }, [fetchDataFromBackend]);

  // Fetch data when component mounts and when tab changes
  useEffect(() => {
    fetchDataFromBackend();
  }, [activeTab, fetchDataFromBackend]);

  // Log state
  const [logs] = useState([
    { id: 1, timestamp: "10:42:01", message: "Transaction Started: Node 0" },
    {
      id: 2,
      timestamp: "10:42:02",
      message: "Begin Write: Movie ID 102 (User Action)",
    },
    { id: 3, timestamp: "10:42:02", message: "Node 1: Prepare Commit" },
    { id: 4, timestamp: "10:42:03", message: "Node 2: Read Request received" },
    {
      id: 5,
      timestamp: "10:42:03",
      message: "Commit: Transaction 445A success",
    },
    { id: 6, timestamp: "10:42:05", message: "Transaction Started: Node 1" },
    { id: 7, timestamp: "10:42:06", message: "Read: Movie ID 15" },
    {
      id: 8,
      timestamp: "10:42:06",
      message: "Sync: Replicating data to Node 2",
    },
  ]);

  // Derived state: The movies to display based on the active tab and pagination
  const currentTabMovies = allMovies[activeTab] || [];
  const totalPages = Math.ceil(currentTabMovies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMovies = currentTabMovies.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Calculate empty rows needed to maintain height
  const emptyRows = itemsPerPage - currentMovies.length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // If null, we are in "Create" mode

  // Initial empty form state
  const initialFormState = {
    titleType: "Movie",
    primaryTitle: "",
    originalTitle: "",
    isAdult: false,
    startYear: "",
    endYear: "",
    runtime: "",
    genres: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- Handlers ---

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when tab changes
  };

  const handlePageChange = (direction) => {
    if (direction === "next" && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    } else if (direction === "prev" && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (movie) => {
    setEditingId(movie.id);
    setFormData(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  // CRUD Operations
  const handleCreate = async (data) => {
    try {
      const backendData = transformFrontendToBackend(data);

      // Validate required fields
      if (!backendData.tconst || !backendData.startYear) {
        throw new Error("tconst and startYear are required");
      }

      // CRUD operations always go to the local node; the backend routes to the
      // appropriate fragments and peers.
      const response = await fetch(`${API_BASE_URL}/title-basics/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backendData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to create: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Create successful:", result);

      // Refresh data after successful create
      await refreshAllTabs();

      return { success: true, data: result };
    } catch (error) {
      console.error("Create error:", error);
      throw error;
    }
  };

  const handleRead = async (id, startYear) => {
    // Only allow read operations on User tab
    if (activeTab !== "User") {
      alert("Read operations are only available on the User tab");
      return;
    }

    try {
      if (!startYear) {
        // Try to find the movie in current tab to get startYear
        const movie = allMovies[activeTab].find((m) => m.id === id);
        if (movie && movie.startYear) {
          startYear = movie.startYear;
        } else {
          throw new Error("startYear is required for read operation");
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/title-basics/read/${id}?startYear=${startYear}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to read: ${response.statusText}`
        );
      }

      const data = await response.json();
      const transformedData = transformBackendData([data])[0];

      console.log("Read successful:", transformedData);

      // Show alert with read data
      alert(
        `Read successful!\nTitle: ${transformedData.primaryTitle}\nType: ${transformedData.titleType}\nYear: ${transformedData.startYear}`
      );

      return { success: true, data: transformedData };
    } catch (error) {
      console.error("Read error:", error);
      alert(`Read failed: ${error.message}`);
      throw error;
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const backendData = transformFrontendToBackend(data);

      // Validate required fields
      if (!backendData.startYear) {
        throw new Error("startYear is required");
      }

      const response = await fetch(
        `${API_BASE_URL}/title-basics/update/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backendData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to update: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Update successful:", result);

      // Refresh data after successful update
      await refreshAllTabs();

      return { success: true, data: result };
    } catch (error) {
      console.error("Update error:", error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    // Only allow delete operations on User tab
    if (activeTab !== "User") {
      alert("Delete operations are only available on the User tab");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      // Find the movie to get startYear
      const movie = allMovies[activeTab].find((m) => m.id === id);
      if (!movie) {
        throw new Error("Movie not found");
      }

      const startYear = movie.startYear;
      if (!startYear) {
        throw new Error("startYear is required for delete operation");
      }

      const response = await fetch(
        `${API_BASE_URL}/title-basics/delete/${id}?startYear=${startYear}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Delete successful:", result);

      // Refresh data after successful delete
      await refreshAllTabs();

      // Check if we need to go back a page after deletion
      const currentListLength = allMovies[activeTab].length - 1;
      if (
        currentPage > 1 &&
        currentListLength <= (currentPage - 1) * itemsPerPage
      ) {
        setCurrentPage((prev) => prev - 1);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Delete failed: ${error.message}`);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only allow CRUD operations on User tab
    if (activeTab !== "User") {
      alert("CRUD operations are only available on the User tab");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await handleUpdate(editingId, formData);
      } else {
        // Create new - generate tconst if not provided
        const createData = {
          ...formData,
          id: formData.id || generateUniqueId(), // Generate tconst if not provided
        };
        await handleCreate(createData);
      }

      handleCloseModal();
    } catch (error) {
      alert(`Operation failed: ${error.message}`);
      console.error("Submit error:", error);
    }
  };

  // Placeholder for test actions
  const runTest = (testName) => {
    console.log(`Running test: ${testName}`);
    // Add logic here to simulate tests
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      {/* Header Section Removed */}

      {/* Main Content Area: Table + Sidebar */}
      <div className="w-full max-w-480 mx-auto flex flex-col lg:flex-row gap-6 mt-4">
        {/* Left Column: Table Section */}
        <div className="flex-1 flex flex-col">
          {/* Controls: Tabs & Add Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            {/* Tabs */}
            <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex space-x-1">
              {["User", "Node 0", "Node 1", "Node 2"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                    activeTab === tab
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Action Button - Only visible on User tab */}
            {activeTab === "User" && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded shadow-sm transition-colors font-medium"
              >
                <Plus size={20} />
                Add Movie
              </button>
            )}
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-2 pl-6 font-semibold text-gray-600 text-sm w-[10%]">
                      ID
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[10%]">
                      Title Type
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[15%]">
                      Primary Title
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[15%]">
                      Original Title
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm text-center w-[8%]">
                      Adult Title
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[8%]">
                      Start
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[8%]">
                      End
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[10%]">
                      Runtime
                    </th>
                    <th className="p-2 font-semibold text-gray-600 text-sm w-[15%]">
                      Genres
                    </th>
                    {activeTab === "User" && (
                      <th className="p-2 font-semibold text-gray-600 text-sm text-center w-[10%]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentMovies.map((movie) => (
                    <tr
                      key={movie.id}
                      className="hover:bg-gray-50 transition-colors h-12"
                    >
                      <td className="p-2 pl-6 text-gray-600 text-sm font-medium">
                        {movie.id}
                      </td>
                      <td className="p-2 text-gray-700 text-sm">
                        {movie.titleType}
                      </td>
                      <td className="p-2 text-gray-900 text-sm">
                        <div className="truncate" title={movie.primaryTitle}>
                          {movie.primaryTitle}
                        </div>
                      </td>
                      <td className="p-2 text-gray-500 text-sm italic">
                        <div className="truncate" title={movie.originalTitle}>
                          {movie.originalTitle}
                        </div>
                      </td>
                      <td className="p-2 text-center text-sm text-gray-700">
                        {movie.isAdult ? "Yes" : "No"}
                      </td>
                      <td className="p-2 text-gray-600 text-sm">
                        {movie.startYear}
                      </td>
                      <td className="p-2 text-gray-600 text-sm">
                        {movie.endYear || "-"}
                      </td>
                      <td className="p-2 text-gray-600 text-sm">
                        {movie.runtime} min
                      </td>
                      <td className="p-2 text-gray-600 text-sm">
                        <div className="truncate" title={movie.genres}>
                          {movie.genres}
                        </div>
                      </td>

                      {/* Actions Column - Only visible on User tab */}
                      {activeTab === "User" && (
                        <td className="p-2">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() =>
                                handleRead(movie.id, movie.startYear)
                              }
                              className="p-1.5 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                              title="Read"
                            >
                              <Book size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(movie)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-gray-200 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(movie.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 border border-gray-200 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Empty rows to maintain table height */}
                  {currentMovies.length > 0 &&
                    Array.from({ length: emptyRows }).map((_, index) => (
                      <tr key={`empty-${index}`} className="h-12">
                        <td
                          colSpan={activeTab === "User" ? "10" : "9"}
                          className="p-2"
                        >
                          &nbsp;
                        </td>
                      </tr>
                    ))}

                  {currentMovies.length === 0 && (
                    <tr className="h-120">
                      <td
                        colSpan={activeTab === "User" ? "10" : "9"}
                        className="p-8 text-center text-gray-400"
                      >
                        No movies found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Section */}
            {totalPages > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium">{startIndex + 1}</span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      startIndex + itemsPerPage,
                      currentTabMovies.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{currentTabMovies.length}</span>{" "}
                  results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange("prev")}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-md border ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800"
                    } transition-colors`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600 font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange("next")}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-md border ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800"
                    } transition-colors`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Log Section */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Transaction Log
              </h3>
            </div>
            <div className="p-4 h-48 overflow-y-auto bg-[#282c34] text-white font-mono text-sm">
              {logs.map((log) => (
                <div key={log.id} className="mb-1">
                  <span className="text-gray-500">[{log.timestamp}]</span>{" "}
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Test Cases */}
        <div className="w-full lg:w-72 shrink-0 space-y-6 lg:mt-14">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-5 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              Test Cases
            </h3>

            {/* Concurrency Tests */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Concurrency Tests
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => runTest("Concurrent Reads")}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 1: Concurrent Reads
                </button>

                <button
                  onClick={() => runTest("Concurrent Write and Read")}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 2: Concurrent Write and Read
                </button>

                <button
                  onClick={() => runTest("Concurrent Writes")}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 3: Concurrent Writes
                </button>
              </div>
            </div>

            {/* Recovery Tests */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Recovery Tests
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    runTest("Case 1: Side Node → Central Node Write Fail")
                  }
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 1: Side Node → Central Node Write Fail
                </button>
                <button
                  onClick={() =>
                    runTest("Case 2: Central Node Recovery Missed Writes")
                  }
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 2: Central Node Recovery Missed Writes
                </button>
                <button
                  onClick={() =>
                    runTest("Case 3: Central Node → Side Node Write Fail")
                  }
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 3: Central Node → Side Node Write Fail
                </button>
                <button
                  onClick={() =>
                    runTest("Case 4: Side Node Recovery Missed Writes")
                  }
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-sm font-medium text-gray-700"
                >
                  Case 4: Side Node Recovery Missed Writes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Pop-up Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? "Edit Movie" : "Create New Movie"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title Type
                    </label>
                    <select
                      name="titleType"
                      value={formData.titleType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="Movie">Movie</option>
                      <option value="TV Series">TV Series</option>
                      <option value="Short">Short</option>
                      <option value="Documentary">Documentary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Title
                    </label>
                    <input
                      required
                      type="text"
                      name="primaryTitle"
                      value={formData.primaryTitle}
                      onChange={handleInputChange}
                      placeholder="e.g. Inception"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Title
                    </label>
                    <input
                      type="text"
                      name="originalTitle"
                      value={formData.originalTitle}
                      onChange={handleInputChange}
                      placeholder="e.g. Inception"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          name="isAdult"
                          checked={formData.isAdult}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div
                          className={`block w-10 h-6 rounded-full transition-colors ${
                            formData.isAdult ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            formData.isAdult ? "transform translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <div className="ml-3 text-sm font-medium text-gray-700">
                        Is Adult
                      </div>
                    </label>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Year
                      </label>
                      <input
                        required
                        type="number"
                        name="startYear"
                        value={formData.startYear}
                        onChange={handleInputChange}
                        placeholder="YYYY"
                        min="1800"
                        max="2100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Year
                      </label>
                      <input
                        type="number"
                        name="endYear"
                        value={formData.endYear}
                        onChange={handleInputChange}
                        placeholder="YYYY"
                        min="1800"
                        max="2100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Runtime (Minutes)
                    </label>
                    <input
                      type="number"
                      name="runtime"
                      value={formData.runtime}
                      onChange={handleInputChange}
                      placeholder="e.g. 120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Genres
                    </label>
                    <input
                      type="text"
                      name="genres"
                      value={formData.genres}
                      onChange={handleInputChange}
                      placeholder="e.g. Action, Drama"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Comma separated
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  {editingId ? "Save Changes" : "Create Movie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
