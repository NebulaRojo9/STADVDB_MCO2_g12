import React, { useState } from "react";
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
  ChevronDown,
} from "lucide-react";

export default function MovieDatabaseApp() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("User"); // 'User', 'Node 0', 'Node 1', 'Node 2'
  const [currentPage, setCurrentPage] = useState(1);
  const [isolationLevel, setIsolationLevel] = useState("Read Committed");
  const itemsPerPage = 10; // Increased to 10 rows

  // --- Initial Data Sets (Input Part) ---
  const INITIAL_USER_DATA = [
    {
      id: 1,
      titleType: "Movie",
      primaryTitle: "Inception",
      originalTitle: "Inception",
      isAdult: false,
      startYear: 2010,
      endYear: "",
      runtime: 148,
      genres: "Action, Sci-Fi",
    },
    {
      id: 2,
      titleType: "TV Series",
      primaryTitle: "Breaking Bad",
      originalTitle: "Breaking Bad",
      isAdult: false,
      startYear: 2008,
      endYear: 2013,
      runtime: 49,
      genres: "Crime, Drama",
    },
    {
      id: 3,
      titleType: "Short",
      primaryTitle: "Piper",
      originalTitle: "Piper",
      isAdult: false,
      startYear: 2016,
      endYear: "",
      runtime: 6,
      genres: "Animation, Family",
    },
    {
      id: 4,
      titleType: "Movie",
      primaryTitle: "The Godfather",
      originalTitle: "The Godfather",
      isAdult: false,
      startYear: 1972,
      endYear: "",
      runtime: 175,
      genres: "Crime, Drama",
    },
    {
      id: 5,
      titleType: "Movie",
      primaryTitle: "The Dark Knight",
      originalTitle: "The Dark Knight",
      isAdult: false,
      startYear: 2008,
      endYear: "",
      runtime: 152,
      genres: "Action, Crime, Drama",
    },
    {
      id: 6,
      titleType: "TV Series",
      primaryTitle: "Stranger Things",
      originalTitle: "Stranger Things",
      isAdult: false,
      startYear: 2016,
      endYear: "",
      runtime: 51,
      genres: "Drama, Fantasy, Horror",
    },
    {
      id: 7,
      titleType: "Movie",
      primaryTitle: "Pulp Fiction",
      originalTitle: "Pulp Fiction",
      isAdult: false,
      startYear: 1994,
      endYear: "",
      runtime: 154,
      genres: "Crime, Drama",
    },
    {
      id: 8,
      titleType: "Short",
      primaryTitle: "Bao",
      originalTitle: "Bao",
      isAdult: false,
      startYear: 2018,
      endYear: "",
      runtime: 8,
      genres: "Animation, Family",
    },
    {
      id: 9,
      titleType: "Movie",
      primaryTitle: "Fight Club",
      originalTitle: "Fight Club",
      isAdult: true,
      startYear: 1999,
      endYear: "",
      runtime: 139,
      genres: "Drama",
    },
    {
      id: 10,
      titleType: "Movie",
      primaryTitle: "Forrest Gump",
      originalTitle: "Forrest Gump",
      isAdult: false,
      startYear: 1994,
      endYear: "",
      runtime: 142,
      genres: "Drama, Romance",
    },
    {
      id: 11,
      titleType: "TV Series",
      primaryTitle: "The Office",
      originalTitle: "The Office",
      isAdult: false,
      startYear: 2005,
      endYear: 2013,
      runtime: 22,
      genres: "Comedy",
    },
    {
      id: 12,
      titleType: "Movie",
      primaryTitle: "Interstellar",
      originalTitle: "Interstellar",
      isAdult: false,
      startYear: 2014,
      endYear: "",
      runtime: 169,
      genres: "Adventure, Drama, Sci-Fi",
    },
    {
      id: 13,
      titleType: "Movie",
      primaryTitle: "Parasite",
      originalTitle: "Gisaengchung",
      isAdult: false,
      startYear: 2019,
      endYear: "",
      runtime: 132,
      genres: "Drama, Thriller",
    },
    {
      id: 14,
      titleType: "TV Series",
      primaryTitle: "Game of Thrones",
      originalTitle: "Game of Thrones",
      isAdult: true,
      startYear: 2011,
      endYear: 2019,
      runtime: 57,
      genres: "Action, Adventure, Drama",
    },
    {
      id: 15,
      titleType: "Movie",
      primaryTitle: "Spirited Away",
      originalTitle: "Sen to Chihiro no Kamikakushi",
      isAdult: false,
      startYear: 2001,
      endYear: "",
      runtime: 125,
      genres: "Animation, Adventure, Family",
    },
    {
      id: 16,
      titleType: "Short",
      primaryTitle: "Feast",
      originalTitle: "Feast",
      isAdult: false,
      startYear: 2014,
      endYear: "",
      runtime: 6,
      genres: "Animation, Comedy, Drama",
    },
    {
      id: 17,
      titleType: "Movie",
      primaryTitle: "Schindler's List",
      originalTitle: "Schindler's List",
      isAdult: false,
      startYear: 1993,
      endYear: "",
      runtime: 195,
      genres: "Biography, Drama, History",
    },
    {
      id: 18,
      titleType: "Movie",
      primaryTitle: "The Matrix",
      originalTitle: "The Matrix",
      isAdult: false,
      startYear: 1999,
      endYear: "",
      runtime: 136,
      genres: "Action, Sci-Fi",
    },
  ];

  const INITIAL_NODE_0_DATA = [
    {
      id: 1,
      titleType: "Movie",
      primaryTitle: "Inception",
      originalTitle: "Inception",
      isAdult: false,
      startYear: 2010,
      endYear: "",
      runtime: 148,
      genres: "Action, Sci-Fi",
    },
    {
      id: 2,
      titleType: "TV Series",
      primaryTitle: "Breaking Bad",
      originalTitle: "Breaking Bad",
      isAdult: false,
      startYear: 2008,
      endYear: 2013,
      runtime: 49,
      genres: "Crime, Drama",
    },
    {
      id: 5,
      titleType: "Movie",
      primaryTitle: "The Dark Knight",
      originalTitle: "The Dark Knight",
      isAdult: false,
      startYear: 2008,
      endYear: "",
      runtime: 152,
      genres: "Action, Crime, Drama",
    },
    {
      id: 6,
      titleType: "TV Series",
      primaryTitle: "Stranger Things",
      originalTitle: "Stranger Things",
      isAdult: false,
      startYear: 2016,
      endYear: "",
      runtime: 51,
      genres: "Drama, Fantasy, Horror",
    },
    {
      id: 11,
      titleType: "TV Series",
      primaryTitle: "The Office",
      originalTitle: "The Office",
      isAdult: false,
      startYear: 2005,
      endYear: 2013,
      runtime: 22,
      genres: "Comedy",
    },
    {
      id: 12,
      titleType: "Movie",
      primaryTitle: "Interstellar",
      originalTitle: "Interstellar",
      isAdult: false,
      startYear: 2014,
      endYear: "",
      runtime: 169,
      genres: "Adventure, Drama, Sci-Fi",
    },
    {
      id: 13,
      titleType: "Movie",
      primaryTitle: "Parasite",
      originalTitle: "Gisaengchung",
      isAdult: false,
      startYear: 2019,
      endYear: "",
      runtime: 132,
      genres: "Drama, Thriller",
    },
    {
      id: 14,
      titleType: "TV Series",
      primaryTitle: "Game of Thrones",
      originalTitle: "Game of Thrones",
      isAdult: true,
      startYear: 2011,
      endYear: 2019,
      runtime: 57,
      genres: "Action, Adventure, Drama",
    },
    {
      id: 15,
      titleType: "Movie",
      primaryTitle: "Spirited Away",
      originalTitle: "Sen to Chihiro no Kamikakushi",
      isAdult: false,
      startYear: 2001,
      endYear: "",
      runtime: 125,
      genres: "Animation, Adventure, Family",
    },
    {
      id: 16,
      titleType: "Short",
      primaryTitle: "Feast",
      originalTitle: "Feast",
      isAdult: false,
      startYear: 2014,
      endYear: "",
      runtime: 6,
      genres: "Animation, Comedy, Drama",
    },
    {
      id: 17,
      titleType: "Movie",
      primaryTitle: "Schindler's List",
      originalTitle: "Schindler's List",
      isAdult: false,
      startYear: 1993,
      endYear: "",
      runtime: 195,
      genres: "Biography, Drama, History",
    },
    {
      id: 18,
      titleType: "Movie",
      primaryTitle: "The Matrix",
      originalTitle: "The Matrix",
      isAdult: false,
      startYear: 1999,
      endYear: "",
      runtime: 136,
      genres: "Action, Sci-Fi",
    },
  ];

  const INITIAL_NODE_1_DATA = [
    {
      id: 3,
      titleType: "Short",
      primaryTitle: "Piper",
      originalTitle: "Piper",
      isAdult: false,
      startYear: 2016,
      endYear: "",
      runtime: 6,
      genres: "Animation, Family",
    },
    {
      id: 7,
      titleType: "Movie",
      primaryTitle: "Pulp Fiction",
      originalTitle: "Pulp Fiction",
      isAdult: false,
      startYear: 1994,
      endYear: "",
      runtime: 154,
      genres: "Crime, Drama",
    },
    {
      id: 8,
      titleType: "Short",
      primaryTitle: "Bao",
      originalTitle: "Bao",
      isAdult: false,
      startYear: 2018,
      endYear: "",
      runtime: 8,
      genres: "Animation, Family",
    },
    {
      id: 9,
      titleType: "Movie",
      primaryTitle: "Fight Club",
      originalTitle: "Fight Club",
      isAdult: true,
      startYear: 1999,
      endYear: "",
      runtime: 139,
      genres: "Drama",
    },
    {
      id: 10,
      titleType: "Movie",
      primaryTitle: "Forrest Gump",
      originalTitle: "Forrest Gump",
      isAdult: false,
      startYear: 1994,
      endYear: "",
      runtime: 142,
      genres: "Drama, Romance",
    },
    {
      id: 20,
      titleType: "Movie",
      primaryTitle: "Goodfellas",
      originalTitle: "Goodfellas",
      isAdult: false,
      startYear: 1990,
      endYear: "",
      runtime: 146,
      genres: "Biography, Crime, Drama",
    },
    {
      id: 21,
      titleType: "TV Series",
      primaryTitle: "The Mandalorian",
      originalTitle: "The Mandalorian",
      isAdult: false,
      startYear: 2019,
      endYear: "",
      runtime: 40,
      genres: "Action, Adventure, Fantasy",
    },
    {
      id: 22,
      titleType: "Movie",
      primaryTitle: "Whiplash",
      originalTitle: "Whiplash",
      isAdult: false,
      startYear: 2014,
      endYear: "",
      runtime: 106,
      genres: "Drama, Music",
    },
    {
      id: 23,
      titleType: "Movie",
      primaryTitle: "The Prestige",
      originalTitle: "The Prestige",
      isAdult: false,
      startYear: 2006,
      endYear: "",
      runtime: 130,
      genres: "Drama, Mystery, Sci-Fi",
    },
    {
      id: 24,
      titleType: "Short",
      primaryTitle: "Paperman",
      originalTitle: "Paperman",
      isAdult: false,
      startYear: 2012,
      endYear: "",
      runtime: 7,
      genres: "Animation, Comedy, Family",
    },
    {
      id: 25,
      titleType: "Movie",
      primaryTitle: "Se7en",
      originalTitle: "Se7en",
      isAdult: true,
      startYear: 1995,
      endYear: "",
      runtime: 127,
      genres: "Crime, Drama, Mystery",
    },
  ];

  const INITIAL_NODE_2_DATA = [
    {
      id: 4,
      titleType: "Movie",
      primaryTitle: "The Godfather",
      originalTitle: "The Godfather",
      isAdult: false,
      startYear: 1972,
      endYear: "",
      runtime: 175,
      genres: "Crime, Drama",
    },
    {
      id: 26,
      titleType: "Movie",
      primaryTitle: "The Shawshank Redemption",
      originalTitle: "The Shawshank Redemption",
      isAdult: false,
      startYear: 1994,
      endYear: "",
      runtime: 142,
      genres: "Drama",
    },
    {
      id: 27,
      titleType: "TV Series",
      primaryTitle: "Chernobyl",
      originalTitle: "Chernobyl",
      isAdult: false,
      startYear: 2019,
      endYear: 2019,
      runtime: 330,
      genres: "Drama, History, Thriller",
    },
    {
      id: 28,
      titleType: "Movie",
      primaryTitle: "City of God",
      originalTitle: "Cidade de Deus",
      isAdult: true,
      startYear: 2002,
      endYear: "",
      runtime: 130,
      genres: "Crime, Drama",
    },
    {
      id: 29,
      titleType: "TV Series",
      primaryTitle: "The Wire",
      originalTitle: "The Wire",
      isAdult: true,
      startYear: 2002,
      endYear: 2008,
      runtime: 59,
      genres: "Crime, Drama, Thriller",
    },
    {
      id: 30,
      titleType: "Movie",
      primaryTitle: "Seven Samurai",
      originalTitle: "Shichinin no Samurai",
      isAdult: false,
      startYear: 1954,
      endYear: "",
      runtime: 207,
      genres: "Action, Adventure, Drama",
    },
    {
      id: 31,
      titleType: "Movie",
      primaryTitle: "It's a Wonderful Life",
      originalTitle: "It's a Wonderful Life",
      isAdult: false,
      startYear: 1946,
      endYear: "",
      runtime: 130,
      genres: "Drama, Family, Fantasy",
    },
    {
      id: 32,
      titleType: "Movie",
      primaryTitle: "Life Is Beautiful",
      originalTitle: "La vita è bella",
      isAdult: false,
      startYear: 1997,
      endYear: "",
      runtime: 116,
      genres: "Comedy, Drama, Romance",
    },
    {
      id: 33,
      titleType: "Short",
      primaryTitle: "La Luna",
      originalTitle: "La Luna",
      isAdult: false,
      startYear: 2011,
      endYear: "",
      runtime: 7,
      genres: "Animation, Family, Fantasy",
    },
    {
      id: 34,
      titleType: "TV Series",
      primaryTitle: "Avatar: The Last Airbender",
      originalTitle: "Avatar: The Last Airbender",
      isAdult: false,
      startYear: 2005,
      endYear: 2008,
      runtime: 23,
      genres: "Animation, Action, Adventure",
    },
    {
      id: 35,
      titleType: "Movie",
      primaryTitle: "The Silence of the Lambs",
      originalTitle: "The Silence of the Lambs",
      isAdult: true,
      startYear: 1991,
      endYear: "",
      runtime: 118,
      genres: "Crime, Drama, Thriller",
    },
  ];

  // Store all lists in a single state object
  const [allMovies, setAllMovies] = useState({
    User: INITIAL_USER_DATA,
    "Node 0": INITIAL_NODE_0_DATA,
    "Node 1": INITIAL_NODE_1_DATA,
    "Node 2": INITIAL_NODE_2_DATA,
  });

  // Log state
  const [logs, setLogs] = useState([
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

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      setAllMovies((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].filter((m) => m.id !== id),
      }));

      // Check if we need to go back a page after deletion
      const currentListLength = allMovies[activeTab].length - 1;
      if (
        currentPage > 1 &&
        currentListLength <= (currentPage - 1) * itemsPerPage
      ) {
        setCurrentPage((prev) => prev - 1);
      }
    }
  };

  const handleRead = (id) => {
    console.log(`Reading movie ID: ${id} from ${activeTab}`);
    // Add logic for manual read here
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setAllMovies((prev) => {
      const currentList = prev[activeTab];
      let updatedList;

      if (editingId) {
        // Update existing
        updatedList = currentList.map((m) =>
          m.id === editingId ? { ...formData, id: editingId } : m
        );
      } else {
        // Create new
        const newId =
          currentList.length > 0
            ? Math.max(...currentList.map((m) => m.id), 0) + 1
            : 1;
        updatedList = [...currentList, { ...formData, id: newId }];
      }

      return {
        ...prev,
        [activeTab]: updatedList,
      };
    });

    handleCloseModal();
  };

  // Placeholder for test actions
  const runTest = (testName) => {
    console.log(
      `Running test: ${testName} with Isolation Level: ${isolationLevel}`
    );
    // Add logic here to simulate tests
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      {/* Header Section Removed */}

      {/* Main Content Area: Table + Sidebar */}
      <div className="max-w-[95%] mx-auto flex flex-col lg:flex-row gap-6 mt-4">
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
                    <th className="p-2 pl-6 font-semibold text-gray-600 text-sm w-[5%]">
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
                              onClick={() => handleRead(movie.id)}
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
                    <tr className="h-[30rem]">
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
        <div className="w-full lg:w-72 flex-shrink-0 space-y-6 lg:mt-14">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-5 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              Test Cases
            </h3>

            {/* Isolation Level Selection */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Isolation Level
              </h4>
              <div className="relative">
                <select
                  value={isolationLevel}
                  onChange={(e) => setIsolationLevel(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded leading-tight focus:outline-none focus:shadow-outline text-sm text-gray-700"
                >
                  <option>Read Uncommitted</option>
                  <option>Read Committed</option>
                  <option>Read Repeatable</option>
                  <option>Serializable</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

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
