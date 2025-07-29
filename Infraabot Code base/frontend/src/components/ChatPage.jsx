import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import LayoutSection from "./LayoutSection";

// Helper: Normalize layout to fit the plot area
function normalizeLayoutToPlot(layout, plotWidth, plotHeight) {
  if (!layout.length) return [];
  const allPoints = layout.flatMap(room => room.points);
  const xs = allPoints.map(([x, y]) => x);
  const ys = allPoints.map(([x, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const layoutWidth = maxX - minX || 1;
  const layoutHeight = maxY - minY || 1;

  return layout.map(room => ({
    ...room,
    points: room.points.map(([x, y]) => [
      ((x - minX) / layoutWidth) * plotWidth,
      ((y - minY) / layoutHeight) * plotHeight,
    ]),
  }));
}

function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Layout state and handlers
  const [layout, setLayout] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [plotDimensions, setPlotDimensions] = useState({ width: 1000, height: 800 });

  // Handler to update room after drag/resize
  const handleUpdateRoom = (idx, updatedRoom) => {
    // Do NOT normalize here!
    setLayout(layout.map((room, i) => (i === idx ? updatedRoom : room)));
  };

  const handleSelectRoom = (idx) => {
    setSelectedRoom(idx);
  };

  const handleDeleteRoom = (idx) => {
    setLayout(layout.filter((_, i) => i !== idx));
    setSelectedRoom(null);
  };

  // Add Room button handler
  const handleAddRoom = () => {
    const newRoom = {
      name: `room${layout.length + 1}`,
      points: [
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ],
    };
    setLayout([...layout, newRoom]);
  };

  // Fetch chat history and latest layout on mount or when plotDimensions change
  useEffect(() => {
    // Fetch messages
    axios.get(`http://127.0.0.1:8000/conversations/${conversationId}/messages`)
      .then(res => setMessages(res.data))
      .catch(() => setMessages([]));
    // Fetch latest layout snapshot
    axios.get(`http://127.0.0.1:8000/conversations/${conversationId}/snapshots`)
      .then(res => {
        if (res.data.length > 0) {
          const latest = res.data[res.data.length - 1];
          // Only normalize when loading from backend!
          setLayout(normalizeLayoutToPlot(JSON.parse(latest.layout_data), plotDimensions.width, plotDimensions.height));
        } else {
          setLayout([]);
        }
      })
      .catch(() => setLayout([]));
    setSelectedRoom(null);
    // eslint-disable-next-line
  }, [conversationId, plotDimensions.width, plotDimensions.height]);

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);

    // Add user message locally
    setMessages(msgs => [
      ...msgs,
      {
        id: Date.now(),
        user_id: 1,
        conversation_id: Number(conversationId),
        message: input,
        response: "",
        timestamp: new Date().toISOString()
      }
    ]);

    try {
      // Send to backend
      const res = await axios.post("http://127.0.0.1:8000/chat", {
        prompt: input,
        user_id: 1,
        conversation_id: Number(conversationId)
      });
      // Add bot response
      setMessages(msgs => [
        ...msgs.slice(0, -1),
        {
          ...msgs[msgs.length - 1],
          response: res.data.response
        }
      ]);
      // Only normalize when new layout is generated from backend!
      setLayout(normalizeLayoutToPlot(res.data.layout || [], plotDimensions.width, plotDimensions.height));

      // Save layout snapshot
      await axios.post("http://127.0.0.1:8000/snapshots", {
        conversation_id: Number(conversationId),
        layout_data: JSON.stringify(res.data.layout || [])
      });

    } catch (err) {
      setMessages(msgs => [
        ...msgs,
        {
          id: Date.now() + 1,
          user_id: 0,
          conversation_id: Number(conversationId),
          message: "",
          response: "Error: Could not reach backend.",
          timestamp: new Date().toISOString()
        }
      ]);
    }

    setInput("");
    setLoading(false);
  };

  return (
    <div className="flex h-screen">
      {/* Left: Chat Window */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
        <button
          className="m-4 px-3 py-1 bg-gray-200 rounded text-sm"
          onClick={() => navigate("/")}
        >
          ← Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold m-4">Infraabot Chat</h2>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, idx) => (
            <React.Fragment key={idx}>
              <div className="p-2 rounded bg-blue-100 text-right ml-8">{msg.message}</div>
              {msg.response && (
                <div className="p-2 rounded bg-gray-100 text-left mr-8">{msg.response}</div>
              )}
            </React.Fragment>
          ))}
          {loading && <div className="text-gray-400">Infraabot is typing...</div>}
        </div>
        <form onSubmit={handleSendMessage} className="p-4 flex gap-2 border-t">
          <input
            className="flex-1 border rounded px-2 py-1"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
            type="submit"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
        <div className="p-4 border-t">
          <button
            className="bg-green-600 text-white px-4 py-1 rounded"
            onClick={handleAddRoom}
          >
            Add Room
          </button>
        </div>
        {/* Plot area input */}
        <form className="p-4 border-t flex gap-2" onSubmit={e => e.preventDefault()}>
          <label>
            Plot Width:
            <input
              type="number"
              value={plotDimensions.width}
              onChange={e =>
                setPlotDimensions({ ...plotDimensions, width: Number(e.target.value) })
              }
              className="border rounded px-2 py-1 ml-1 w-20"
              min={100}
            />
          </label>
          <label>
            Plot Height:
            <input
              type="number"
              value={plotDimensions.height}
              onChange={e =>
                setPlotDimensions({ ...plotDimensions, height: Number(e.target.value) })
              }
              className="border rounded px-2 py-1 ml-1 w-20"
              min={100}
            />
          </label>
        </form>
      </div>

      {/* Right: Layout & Report Tabs */}
      <div className="w-2/3 flex flex-col bg-gray-50">
        <LayoutSection
          layout={layout}
          plotDimensions={plotDimensions}
          onUpdateRoom={handleUpdateRoom}
          selectedRoom={selectedRoom}
          onSelectRoom={handleSelectRoom}
          onDeleteRoom={handleDeleteRoom}
        />
      </div>
    </div>
  );
}

export default ChatPage;
