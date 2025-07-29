import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  // Replace with your actual user ID logic
  const userId = 1;

  useEffect(() => {
    // Fetch user info
    axios.get(`http://127.0.0.1:8000/user-info?user_id=${userId}`)
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
    // Fetch conversations
    axios.get(`http://127.0.0.1:8000/conversations?user_id=${userId}`)
      .then(res => setConversations(res.data))
      .catch(() => setConversations([]));
  }, []);

  const handleStartNewChat = async () => {
    // Create a new conversation in the backend
    const title = "New Conversation";
    const res = await axios.post("http://127.0.0.1:8000/conversations", { user_id: userId, title });
    navigate(`/chat/${res.data.id}`);
  };

  const handleConversationClick = (id) => {
    navigate(`/chat/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* User Info */}
      {user && (
        <div className="flex items-center mb-8">
          <img src={user.avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full mr-4" />
          <div>
            <div className="font-bold text-xl">{user.name}</div>
            <div className="text-gray-500">{user.email}</div>
          </div>
        </div>
      )}

      {/* Start New Chat Button */}
      <button
        className="mb-6 px-5 py-2 bg-blue-600 text-white rounded"
        onClick={handleStartNewChat}
      >
        + Start New Chat
      </button>

      {/* Conversation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conversations.map(conv => (
          <div
            key={conv.id}
            className="border rounded p-4 cursor-pointer hover:shadow"
            onClick={() => handleConversationClick(conv.id)}
          >
            <div className="font-bold">{conv.title}</div>
            <div className="text-sm text-gray-500">{new Date(conv.created_at).toLocaleString()}</div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="text-gray-400 col-span-2">No conversations yet. Start a new chat!</div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
