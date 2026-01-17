// Chat slice for managing chat conversations, messages, and visualizations
// Handles AI interactions, conversation history, and data visualization features
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

// Store AbortController for cancellation
let currentAbortController = null;

// --- Async Thunk for sending a message to the AI ---
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (messageData, thunkAPI) => {
    const { naturalLanguageQuery, projectId } = messageData;
    const state = thunkAPI.getState();
    const { token } = state.auth;

    if (!token) {
      return thunkAPI.rejectWithValue("No authorization token found");
    }

    //  ONLY send conversationId if Redux already has one
    const conversationId = state.chat.conversationId ?? null;
    const wasNewConversation = !conversationId;

    try {
      const response = await fetch(`${API_BASE}/analyze-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          naturalLanguageQuery,
          projectId,
          ...(conversationId && { conversationId }), // 🔥 key fix
        }),
      });

      const result = await response.json();
      const data = result.data;

      if (!data?.conversationId) {
        return thunkAPI.rejectWithValue("Invalid server response");
      }

      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Function to cancel the current request (called from thunk)
const cancelCurrentRequest = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};

// Thunk to cancel the current chat request
export const cancelChatRequest = () => {
  return (dispatch) => {
    cancelCurrentRequest();
    dispatch(cancelChat());
  };
};

// --- Async Thunk for generating visualizations ---
export const generateVisualization = createAsyncThunk(
  "chat/generateVisualization",
  async (messageData, thunkAPI) => {
    const { naturalLanguageQuery, conversationId, projectId } = messageData;
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      console.log("📊 Generating visualization:", {
        naturalLanguageQuery,
        conversationId,
        projectId,
      });

      const response = await fetch(`${API_BASE}/generate-visualization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          naturalLanguageQuery,
          conversationId,
          projectId,
        }),
      });

      const result = await response.json();
      console.log("📈 Visualization response:", result);

      const data = result.data;
      if (!data) {
        return thunkAPI.rejectWithValue(
          (data && data.error) ||
            result.error ||
            "Invalid response from server."
        );
      }

      // Log visualization data
      if (data.visualization) {
        console.log(" Generated visualization:", {
          type: data.visualization.type,
          hasData: !!data.visualization.data,
          title: data.visualization.title,
        });
      }

      return data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// --- Visualization Management Thunks ---

// Get stored visualizations
export const getVisualizations = createAsyncThunk(
  "chat/getVisualizations",
  async (params, thunkAPI) => {
    const { projectId, conversationId, limit = 50, offset = 0 } = params;
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const queryParams = new URLSearchParams();
      if (projectId) queryParams.append("project_id", projectId);
      if (conversationId) queryParams.append("conversation_id", conversationId);
      queryParams.append("limit", limit);
      queryParams.append("offset", offset);

      const response = await fetch(
        `${API_BASE}/visualizations?${queryParams}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to fetch visualizations"
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get a specific visualization
export const getVisualization = createAsyncThunk(
  "chat/getVisualization",
  async (visualizationId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const response = await fetch(
        `${API_BASE}/visualizations/${visualizationId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to fetch visualization"
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Toggle favorite status of a visualization
export const toggleFavoriteVisualization = createAsyncThunk(
  "chat/toggleFavoriteVisualization",
  async (visualizationId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const response = await fetch(
        `${API_BASE}/visualizations/${visualizationId}/favorite`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to toggle favorite status"
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete a visualization
export const deleteVisualization = createAsyncThunk(
  "chat/deleteVisualization",
  async (visualizationId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const response = await fetch(
        `${API_BASE}/visualizations/${visualizationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to delete visualization"
        );
      }

      const result = await response.json();
      return { visualizationId, ...result };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get chat history for a conversation
export const getChatHistory = createAsyncThunk(
  "chat/getHistory",
  async (conversationId, thunkAPI) => {
    // Defensive check: Only proceed if conversationId is a valid UUID
    if (!conversationId || !/^[0-9a-fA-F-]{36}$/.test(conversationId)) {
      return thunkAPI.rejectWithValue("Invalid or missing conversation ID.");
    }

    // Get token from localStorage (not from Redux state since you're using localStorage)
    const token = localStorage.getItem("token");

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      // FIX: Use Next.js proxy endpoint, not direct FastAPI URL
      const response = await fetch(
        `${API_BASE}/conversations/${conversationId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("getChatHistory - Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("getChatHistory - Error response:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || "Failed to fetch conversation" };
        }

        return thunkAPI.rejectWithValue(
          errorData.detail || errorData.error || "Failed to fetch conversation"
        );
      }

      const responseData = await response.json();
      console.log("getChatHistory - Response data:", responseData);

      let conversation, messages;
      let rawMessages = []; // Declare rawMessages here

      // Backend returns: { success: true, data: { conversation, messages } }
      if (responseData.success && responseData.data) {
        if (responseData.data.conversation) {
          conversation = responseData.data.conversation;
          rawMessages = responseData.data.messages || [];
        } else if (responseData.data.id) {
          // Backend might return conversation directly in data
          conversation = responseData.data;
          rawMessages = responseData.data.messages || [];
        } else {
          // Backend returns conversation with messages directly
          conversation = responseData.data;
          rawMessages = responseData.data.messages || [];
        }
      } else if (responseData.id) {
        // Fallback: conversation object directly
        conversation = responseData;
        rawMessages = responseData.messages || [];
        console.warn("[ChatSlice] Received conversation without data wrapper");
      } else {
        console.error("Invalid response format:", responseData);
        return thunkAPI.rejectWithValue("Invalid response format from server.");
      }

      // Process messages...
      messages = rawMessages
        .filter((msg) => msg && (msg.id || msg.ID || msg.message_id))
        .map((msg) => {
          try {
            // Ensure message has required fields
            const messageId = msg.id || msg.ID || msg.message_id;
            const messageRole = msg.role || "ai";
            const messageContent = msg.content || "";

            // Handle both camelCase and snake_case for createdAt
            let createdAt = msg.createdAt || msg.created_at;
            if (!createdAt) {
              createdAt = new Date().toISOString();
            } else if (typeof createdAt === "string") {
              // Validate and parse date string
              if (!createdAt.includes("T") && !createdAt.includes("Z")) {
                // If it's a date string without time, try to parse it
                const parsedDate = new Date(createdAt);
                if (!isNaN(parsedDate.getTime())) {
                  createdAt = parsedDate.toISOString();
                } else {
                  createdAt = new Date().toISOString();
                }
              } else {
                // Validate ISO string
                const parsedDate = new Date(createdAt);
                if (isNaN(parsedDate.getTime())) {
                  createdAt = new Date().toISOString();
                }
              }
            } else if (createdAt instanceof Date) {
              createdAt = createdAt.toISOString();
            } else {
              createdAt = new Date().toISOString();
            }

            // Ensure conversationId is set
            const msgConversationId =
              msg.conversation_id || msg.conversationId || conversation?.id;

            return {
              id: messageId,
              role: messageRole,
              content: messageContent,
              queryType: msg.query_type || msg.queryType || null,
              generatedSql: msg.generated_sql || msg.generatedSql || null,
              createdAt: createdAt,
              visualization: msg.visualization || null,
              conversationId: msgConversationId,
              isImportant: msg.is_important || false,
            };
          } catch (error) {
            console.error("[ChatSlice] Error processing message:", error, msg);
            return null;
          }
        })
        .filter((msg) => msg !== null);

      // Validate that we have a conversation
      if (!conversation || !conversation.id) {
        console.error("Invalid conversation data:", conversation);
        return thunkAPI.rejectWithValue(
          "Invalid conversation data received from server."
        );
      }

      // Ensure all messages have the correct conversationId
      messages = messages.map((msg) => ({
        ...msg,
        conversationId: msg.conversationId || conversation.id,
      }));

      // Ensure messages are sorted by createdAt
      messages.sort((a, b) => {
        try {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          if (isNaN(dateA) || isNaN(dateB)) {
            return 0;
          }
          return dateA - dateB;
        } catch (error) {
          console.error("[ChatSlice] Error sorting messages:", error);
          return 0;
        }
      });

      console.log("getChatHistory - Successfully loaded:", {
        conversationId: conversation.id,
        messageCount: messages.length,
        messagesWithVisualization: messages.filter((m) => m.visualization)
          .length,
      });

      return {
        conversation,
        messages,
      };
    } catch (error) {
      console.error("getChatHistory - Fetch error:", error);
      const message = error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all conversations for a project
export const getConversations = createAsyncThunk(
  "chat/getConversations",
  async (projectId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const response = await fetch(
        `${API_BASE}/conversations?project_id=${projectId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Failed to fetch conversations" }));
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to fetch conversations"
        );
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Mark a message as important
export const markMessageImportant = createAsyncThunk(
  "chat/markMessageImportant",
  async (messageId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue("No auth token");
    }

    try {
      const response = await fetch(
        `${API_BASE}/messages/${messageId}/important`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      const data = await response.json();

      // 🔥 USE BACKEND RESPONSE
      return {
        messageId: data.messageId,
        isImportant: data.important,
      };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Unmark a message as important
export const unmarkMessageImportant = createAsyncThunk(
  "chat/unmarkMessageImportant",
  async (messageId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      throw new Error("No auth token");
    }

    const response = await fetch(
      `${API_BASE}/messages/${messageId}/important`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data = await response.json();

    return {
      messageId: data.messageId,
      isImportant: data.important,
    };
  }
);

// Get important messages
export const getImportantMessages = createAsyncThunk(
  "chat/getImportantMessages",
  async (projectId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const url = projectId
        ? `${API_BASE}/important-messages?project_id=${projectId}`
        : `${API_BASE}/important-messages`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📋 Fetching important messages for project:", projectId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        return thunkAPI.rejectWithValue(
          errorData.detail ||
            errorData.message ||
            "Failed to fetch important messages"
        );
      }

      const responseData = await response.json();
      console.log(" Important messages response:", responseData);

      // Backend returns {success: true, data: [...]}
      if (responseData.success && Array.isArray(responseData.data)) {
        return responseData.data;
      }
      return [];
    } catch (error) {
      console.error(" Error fetching important messages:", error);
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete conversation
export const deleteConversation = createAsyncThunk(
  "chat/deleteConversation",
  async (conversationId, { rejectWithValue }) => {
    try {
      console.log(
        "🗑️ Redux: Starting delete for conversation:",
        conversationId
      );

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${API_BASE}/conversations/${conversationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("Redux: Response status:", response.status);

      // Get response text first
      const responseText = await response.text();
      console.log("Redux: Response text:", responseText);

      // Parse JSON if response exists
      let data;
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log("Redux: Parsed data:", data);
        } catch (e) {
          console.error("Redux: Failed to parse JSON:", e);
          // If we can't parse JSON but status is OK, assume success
          if (response.ok) {
            console.log("Redux: Assuming success from status code");
            data = { success: true };
          } else {
            throw new Error(`Invalid JSON response: ${responseText}`);
          }
        }
      } else {
        // Empty response - check status code
        if (response.ok) {
          console.log("Redux: Empty response but status OK, assuming success");
          data = { success: true };
        } else {
          throw new Error(`Empty response with status ${response.status}`);
        }
      }

      // Check if response indicates success
      if (!response.ok) {
        console.error("Redux: Response not OK");
        const errorMessage =
          data?.error ||
          data?.details ||
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Check if the data object indicates success
      if (data && data.success === false) {
        console.error("Redux: Response indicates failure");
        const errorMessage =
          data.error || data.details || "Failed to delete conversation";
        throw new Error(errorMessage);
      }

      console.log(
        "Redux: Delete successful, returning conversation ID:",
        conversationId
      );
      return conversationId;
    } catch (error) {
      console.error("Redux: Error in deleteConversation:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete message
export const deleteMessage = createAsyncThunk(
  "chat/deleteMessage",
  async (messageId, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;

    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }

    try {
      const response = await fetch(`${API_BASE}/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to delete message"
        );
      }

      return messageId;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update conversation title
export const updateConversationTitle = createAsyncThunk(
  "chat/updateConversationTitle",
  async ({ conversationId, title }, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;
    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }
    try {
      const response = await fetch(
        `${API_BASE}/conversations/${conversationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to update conversation title"
        );
      }
      return { conversationId, title };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Rename (update) conversation title
export const updateConversation = createAsyncThunk(
  "chat/updateConversation",
  async ({ conversationId, title }, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;
    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }
    try {
      const response = await fetch(
        `${API_BASE}/conversations/${conversationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to update conversation"
        );
      }
      return { conversationId, title };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateImportantMessageTitle = createAsyncThunk(
  "chat/updateImportantMessageTitle",
  async ({ messageId, title }, thunkAPI) => {
    const { token } = thunkAPI.getState().auth;
    if (!token) {
      return thunkAPI.rejectWithValue(
        "No authorization token found. Please log in."
      );
    }
    try {
      const response = await fetch(
        `${API_BASE}/messages/${messageId}/important-title`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        return thunkAPI.rejectWithValue(
          errorData.detail || "Failed to update title"
        );
      }
      return { messageId, title };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  messages: [], // Stores the list of messages in the current chat
  conversationId: null, // Stores the ID of the current conversation
  conversations: [], // Stores all conversations for the current project
  importantMessages: [], // Stores important messages
  currentConversation: null, // Current conversation details
  visualizations: [], // Stores all visualizations for the current project/conversation
  currentVisualization: null, // Current visualization details
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - for AI responses
  conversationsStatus: "idle", // Separate status for conversations
  importantMessagesStatus: "idle", // Separate status for important messages
  importanceOperationStatus: "idle", // Separate status for importance operations
  visualizationsStatus: "idle", // Separate status for visualizations
  deleteStatus: "idle", // Separate status for delete operations
  error: null,
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    // This standard reducer instantly adds the user's message to the UI
    addHumanMessage: (state, action) => {
      // Only add message if it's for the current conversation or no conversation is set yet
      const messageConversationId = action.payload.conversationId;
      if (
        state.conversationId &&
        messageConversationId &&
        state.conversationId !== messageConversationId
      ) {
        console.log(
          `[ChatSlice] Ignoring addHumanMessage for conversation ${messageConversationId}, current is ${state.conversationId}`
        );
        return;
      }

      state.messages.push({
        role: "human",
        content: action.payload.content,
        id: action.payload.id || null, // Don't generate ID here, will be set by backend
        createdAt: action.payload.createdAt || new Date().toISOString(),
      });
      // Only set conversationId if it's provided and we don't have one yet
      // Don't set it to null/undefined - let backend create it
      if (!state.conversationId && action.payload.conversationId) {
        state.conversationId = action.payload.conversationId;
      }
    },
    addAiMessage: (state, action) => {
      // Only add message if it's for the current conversation
      const messageConversationId = action.payload.conversationId;
      if (
        state.conversationId &&
        messageConversationId &&
        state.conversationId !== messageConversationId
      ) {
        console.log(
          `[ChatSlice] Ignoring addAiMessage for conversation ${messageConversationId}, current is ${state.conversationId}`
        );
        return;
      }

      const newMessage = {
        role: "ai",
        content: action.payload.content,
        id: action.payload.id || null,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        queryType: action.payload.queryType || null,
        generatedSql: action.payload.generatedSql || null,
        isImportant: action.payload.isImportant || false,
        visualization: action.payload.visualization || null,
      };

      state.messages.push(newMessage);
    },
    // Used to clear the chat when a user navigates away or starts a new project chat
    clearChat: (state) => {
      state.messages = [];
      state.conversationId = null;
      state.currentConversation = null;
      state.status = "idle";
      state.error = null;
      // Don't clear conversations list - keep it for sidebar
    },

    // Set current conversation
    setCurrentConversation: (state, action) => {
      state.currentConversation = action.payload;
    },

    // Update message importance locally
    updateMessageImportance: (state, action) => {
      const { messageId, isImportant } = action.payload;
      const message = state.messages.find((m) => m.id === messageId);
      if (message) {
        message.isImportant = isImportant;
      }
    },

    // Cancel current chat request
    cancelChat: (state) => {
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // sendMessage Thunk
      .addCase(sendMessage.pending, (state) => {
        state.status = "loading"; // Used to show "AI is typing..."
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        const wasNewConversation =
          !state.conversationId && action.payload.conversationId;
        const responseConversationId = action.payload.conversationId;

        // Only update if this response is for the current conversation
        // This prevents messages from being added to the wrong conversation
        if (
          responseConversationId &&
          state.conversationId &&
          state.conversationId !== responseConversationId
        ) {
          console.log(
            `[ChatSlice] Ignoring sendMessage response for conversation ${responseConversationId}, current is ${state.conversationId}`
          );
          return; // Don't update state if conversation doesn't match
        }

        state.conversationId = responseConversationId || state.conversationId; // Update the conversationId

        // Find the last user message without an ID (optimistic message) for this conversation
        const lastUserMessageIndex = state.messages.findIndex(
          (msg) =>
            msg.role === "human" &&
            !msg.id &&
            (!responseConversationId ||
              !state.conversationId ||
              state.conversationId === responseConversationId)
        );

        let aiMessage = {
          role: "ai",
          content: action.payload.analysis, // The AI's response text
          queryType: action.payload.queryType,
          generatedSql: action.payload.generatedSql,
          id: action.payload.aiMessageId || uuidv4(),
          createdAt: action.payload.aiCreatedAt || new Date().toISOString(),
          isImportant: false,
          // CRITICAL: Include visualization data if present
          visualization: action.payload.visualization || null,
        };

        if (lastUserMessageIndex !== -1 && action.payload.userMessageId) {
          // Update the user message with the correct ID and createdAt from backend
          state.messages[lastUserMessageIndex].id =
            action.payload.userMessageId;
          if (action.payload.userCreatedAt) {
            state.messages[lastUserMessageIndex].createdAt =
              action.payload.userCreatedAt;
          }

          // Check if AI message already exists (prevent duplicates)
          const aiMessageExists = state.messages.some(
            (msg) =>
              msg.id === aiMessage.id ||
              (msg.role === "ai" && msg.content === aiMessage.content && msg.id)
          );

          if (!aiMessageExists) {
            // Insert the AI message immediately after the user message
            state.messages.splice(lastUserMessageIndex + 1, 0, aiMessage);
          }
        } else {
          // Fallback: just push the AI message (but only if conversation matches and not duplicate)
          if (
            !responseConversationId ||
            !state.conversationId ||
            state.conversationId === responseConversationId
          ) {
            // Check if message already exists
            const aiMessageExists = state.messages.some(
              (msg) =>
                msg.id === aiMessage.id ||
                (msg.role === "ai" &&
                  msg.content === aiMessage.content &&
                  msg.id)
            );
            if (!aiMessageExists) {
              state.messages.push(aiMessage);
            }
          }
        }

        // If this was a new conversation, add it optimistically
        // Components will refresh explicitly to get fresh data from backend
        if (wasNewConversation) {
          // Also add the new conversation to the list optimistically
          // Use the first user message as title (find the most recent human message)
          const userMessages = state.messages.filter((m) => m.role === "human");
          const lastUserMessage = userMessages[userMessages.length - 1];
          const title =
            lastUserMessage?.content?.substring(0, 60) ||
            action.payload.analysis?.substring(0, 60) ||
            "New Chat";
          const newConversation = {
            id: action.payload.conversationId,
            title: title,
            created_at:
              action.payload.userCreatedAt || new Date().toISOString(),
            updated_at: action.payload.aiCreatedAt || new Date().toISOString(),
            message_count: 2, // User message + AI message
            user_id: state.userId || null,
            project_id: action.payload.projectId || null,
            status: "active", // Ensure status is set
            is_archived: false, // Ensure is_archived is set
          };
          // Add to beginning of list (most recent first) - but check if it doesn't already exist
          const existingIndex = state.conversations.findIndex(
            (c) => c.id === action.payload.conversationId
          );
          if (existingIndex === -1) {
            state.conversations = [newConversation, ...state.conversations];
          } else {
            // Update existing conversation (preserve backend data if available)
            state.conversations[existingIndex] = {
              ...state.conversations[existingIndex],
              ...newConversation,
              // Keep backend title if it exists and is more complete
              title:
                state.conversations[existingIndex].title ||
                newConversation.title,
            };
            // Move to top
            state.conversations = [
              state.conversations[existingIndex],
              ...state.conversations.filter((_, i) => i !== existingIndex),
            ];
          }
        }

        console.log(
          " sendMessage.fulfilled - Added AI message with visualization:",
          {
            hasVisualization: !!aiMessage.visualization,
            vizType: aiMessage.visualization?.type,
            messageId: aiMessage.id,
          }
        );
      })
      .addCase(sendMessage.rejected, (state, action) => {
        // Don't show error message if it was cancelled
        if (action.payload === "Request cancelled") {
          state.status = "idle";
          state.error = null;
          return;
        }
        state.status = "failed";
        state.error = action.payload;
        state.messages.push({
          role: "ai",
          content: `Sorry, an error occurred: ${action.payload}`,
          isError: true, // Add a flag for styling error messages
        });
        toast.error("An error occurred while getting a response.");
      })
      // getChatHistory Thunk
      .addCase(getChatHistory.pending, (state) => {
        state.status = "loading"; // Show loading state
      })
      .addCase(getChatHistory.fulfilled, (state, action) => {
  // Replace messages with fetched history - ensure we're loading the correct conversation
  const fetchedConversationId = action.payload?.conversation?.id;
  const fetchedMessages = Array.isArray(action.payload?.messages)
    ? action.payload.messages
    : [];

  // Validate conversation data
  if (
    !action.payload ||
    !action.payload.conversation ||
    !fetchedConversationId
  ) {
    console.error(
      "[ChatSlice] getChatHistory.fulfilled: Invalid conversation data",
      action.payload
    );
    state.status = "failed";
    state.error = "Invalid conversation data received";
    return;
  }

  // Only update if this is the conversation we're currently viewing
  // This prevents race conditions where old fetch completes after switching conversations
  if (
    !state.conversationId ||
    state.conversationId === fetchedConversationId
  ) {
    // Process messages with visualization data
    const processMessageWithVisualization = (msg) => {
      const messageId = msg.id || msg.ID;
      if (!messageId) return null;

      // Extract visualization data from message
      let visualization = null;
      
      // Check if message has visualization in different formats
      if (msg.visualization) {
        // Direct visualization object
        visualization = msg.visualization;
      } else if (msg.chart_data || msg.chart_type) {
        // Chart data from backend (common format)
        // Check if chart_data is a JSON string that needs parsing
        if (msg.chart_data && typeof msg.chart_data === 'string') {
          const chartData = msg.chart_data.trim();
          if (chartData.startsWith('{')) {
            try {
              const parsed = JSON.parse(chartData);
              visualization = {
                type: parsed.type || msg.chart_type,
                data: parsed.data, // The actual base64 string
                title: parsed.title || msg.title,
                query: parsed.query || msg.query_used,
                createdAt: msg.created_at || msg.createdAt
              };
            } catch (e) {
              console.warn(`Failed to parse chart_data JSON for message ${messageId}:`, e);
              // If parsing fails, use raw chart_data
              visualization = {
                type: msg.chart_type,
                data: msg.chart_data,
                title: msg.title,
                query: msg.query_used,
                createdAt: msg.created_at || msg.createdAt
              };
            }
          } else {
            // chart_data is already base64
            visualization = {
              type: msg.chart_type,
              data: msg.chart_data,
              title: msg.title,
              query: msg.query_used,
              createdAt: msg.created_at || msg.createdAt
            };
          }
        }
      }

      return {
        id: messageId,
        role: msg.role || (msg.sender === 'user' ? 'human' : 'ai'),
        content: msg.content || msg.message_content,
        queryType: msg.query_type,
        generatedSql: msg.generated_sql,
        createdAt: msg.created_at || msg.createdAt || new Date().toISOString(),
        isImportant: msg.is_important || false,
        conversationId: fetchedConversationId,
        visualization: visualization
      };
    };

    // Process all messages
    const processedMessages = fetchedMessages
      .map(processMessageWithVisualization)
      .filter(msg => msg !== null);

    // Ensure chronological order
    processedMessages.sort((a, b) => {
      try {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        if (isNaN(dateA) || isNaN(dateB)) {
          return 0;
        }
        return dateA - dateB;
      } catch (error) {
        console.error("[ChatSlice] Error sorting messages:", error);
        return 0;
      }
    });

    // 🔥 CRITICAL: Merge visualizations from state.visualizations
    // Create a map of visualizations by message_id from the visualizations array
    const visualizationMap = {};
    if (state.visualizations && Array.isArray(state.visualizations)) {
      state.visualizations.forEach(viz => {
        const messageId = viz.message_id || viz.messageId;
        if (messageId) {
          // Process visualization data
          let normalizedViz = null;
          
          if (viz.chart_data && typeof viz.chart_data === 'string') {
            const chartData = viz.chart_data.trim();
            if (chartData.startsWith('{')) {
              try {
                const parsed = JSON.parse(chartData);
                normalizedViz = {
                  id: viz.id,
                  type: parsed.type || viz.chart_type,
                  data: parsed.data, // Extract base64 from JSON
                  title: parsed.title || viz.title,
                  query: parsed.query || viz.query_used,
                  createdAt: viz.created_at || viz.createdAt
                };
              } catch (e) {
                console.warn(`Failed to parse visualization JSON for ${messageId}:`, e);
                normalizedViz = {
                  id: viz.id,
                  type: viz.chart_type,
                  data: viz.chart_data,
                  title: viz.title,
                  query: viz.query_used,
                  createdAt: viz.created_at || viz.createdAt
                };
              }
            } else {
              normalizedViz = {
                id: viz.id,
                type: viz.chart_type,
                data: viz.chart_data,
                title: viz.title,
                query: viz.query_used,
                createdAt: viz.created_at || viz.createdAt
              };
            }
          }
          
          if (normalizedViz) {
            visualizationMap[messageId] = normalizedViz;
          }
        }
      });
    }

    // Merge visualizations into messages
    const finalMessages = processedMessages.map(message => {
      const messageId = message.id;
      const storedVisualization = visualizationMap[messageId];
      
      // If message already has visualization, check if we need to enhance it
      if (message.visualization) {
        // If stored visualization has data but message visualization doesn't, use stored one
        if (storedVisualization && storedVisualization.data && 
            (!message.visualization.data || message.visualization.data.length < 100)) {
          return {
            ...message,
            visualization: storedVisualization
          };
        }
        return message; // Keep existing visualization
      }
      
      // If no visualization on message but we have one stored, add it
      if (storedVisualization) {
        return {
          ...message,
          visualization: storedVisualization
        };
      }
      
      return message;
    });

    state.messages = finalMessages;
    state.currentConversation = action.payload.conversation;
    state.conversationId = fetchedConversationId;
    state.status = "succeeded";
    state.error = null;

    console.log(
      ` getChatHistory.fulfilled - Loaded ${finalMessages.length} messages for conversation ${fetchedConversationId}`,
      {
        messagesWithVisualizations: finalMessages.filter(m => m.visualization).length,
        totalVisualizationsInState: state.visualizations?.length || 0,
        visualizationMapSize: Object.keys(visualizationMap).length
      }
    );

    // 🔥 IMPORTANT: Trigger visualization fetch after loading chat history
    // This ensures we get the latest visualizations even if they weren't in the initial response
    if (fetchedConversationId && !state.visualizations?.length) {
      console.log(`🔄 No visualizations in state, will fetch for conversation ${fetchedConversationId}`);
      // The component should handle fetching visualizations after chat history loads
    }
  } else {
    // Different conversation was loaded, ignore this result
    console.log(
      `[ChatSlice] Ignoring getChatHistory result for conversation ${fetchedConversationId}, current is ${state.conversationId}`
    );
  }
})
      .addCase(getChatHistory.rejected, (state, action) => {
        state.status = "failed";
        const errorMessage =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message ||
              action.payload?.detail ||
              "Failed to load chat history";
        state.error = errorMessage;

        // If conversation not found, clear the conversation ID to prevent stale state
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("404") ||
          errorMessage.includes("Conversation not found")
        ) {
          state.conversationId = null;
          state.currentConversation = null;
          state.messages = [];
        }
      })
      // getConversations Thunk
      .addCase(getConversations.pending, (state) => {
        state.conversationsStatus = "loading";
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        // Replace conversations array with fresh data from backend
        // Always replace, never merge, to ensure we have the latest data
        const freshConversations = Array.isArray(action.payload)
          ? action.payload
          : [];

        // Filter out any deleted conversations that might have slipped through
        // Check both status and is_archived fields (handle both boolean and numeric)
        // NULL status is treated as active (for newly created conversations)
        const validConversations = freshConversations.filter((conv) => {
          const status = conv.status;
          // Handle both boolean and numeric is_archived (0/1 or false/true)
          const isArchived =
            conv.is_archived === true ||
            conv.is_archived === 1 ||
            conv.is_archived === "1";

          // Only include active, non-archived, non-deleted conversations
          // NULL status is treated as active, explicit 'deleted' status is excluded
          const isActive =
            status === null || status === undefined || status === "active";
          const isNotDeleted = status !== "deleted";
          const isNotArchived = !isArchived;

          return isActive && isNotDeleted && isNotArchived;
        });

        // Deduplicate conversations by ID (in case backend returns duplicates)
        const conversationMap = new Map();
        validConversations.forEach((conv) => {
          if (conv.id && !conversationMap.has(conv.id)) {
            conversationMap.set(conv.id, conv);
          }
        });

        // Convert back to array and sort by updated_at DESC (most recent first)
        const deduplicatedConversations = Array.from(
          conversationMap.values()
        ).sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA; // Descending order
        });

        // Merge strategy: Trust backend response and merge with existing state intelligently
        // Backend query excludes deleted/archived conversations, so if not in response = deleted
        const backendConversationIds = new Set(
          deduplicatedConversations.map((c) => c.id).filter(Boolean)
        );
        const now = Date.now(); // Use same timestamp for consistency

        // Preserve existing conversations only if:
        // 1. They're the current conversation (always preserve - user is viewing it)
        // 2. They're very recent (within 30 seconds - might not be in backend yet due to timing)
        // 3. They exist in backend response (will be replaced with backend version)
        const preservedConversations = state.conversations.filter((conv) => {
          if (!conv.id) return false;

          // Always keep the current conversation (user is viewing it)
          if (
            conv.id === state.conversationId &&
            conv.status !== "deleted" &&
            !conv.is_archived
          ) {
            return true;
          }

          // If it exists in backend, we'll use backend version (don't preserve here)
          if (backendConversationIds.has(conv.id)) return false;

          // Keep very recent conversations (within 30 seconds) - might not be in backend yet
          // This is only for newly created conversations that haven't been committed
          try {
            const convTime = new Date(
              conv.created_at || conv.updated_at || 0
            ).getTime();
            const isVeryRecent = convTime > 0 && now - convTime < 30000; // 30 seconds
            if (isVeryRecent) return true;
          } catch (e) {
            // If date parsing fails, don't preserve (be conservative)
            return false;
          }

          // If conversation is not in backend response and not very recent, it's likely deleted
          // Trust the backend - if it's not returned, remove it
          return false;
        });

        // Merge: Start with backend conversations (source of truth), then add preserved conversations
        // Preserved conversations are only very recent ones or current conversation
        const mergedConversations = [...deduplicatedConversations];

        // Add preserved conversations (current conversation or very recent ones) that aren't in backend
        preservedConversations.forEach((preservedConv) => {
          const existsInBackend = backendConversationIds.has(preservedConv.id);
          if (!existsInBackend) {
            // Only add if not already in merged list
            const existingIndex = mergedConversations.findIndex(
              (c) => c.id === preservedConv.id
            );
            if (existingIndex < 0) {
              mergedConversations.push(preservedConv);
            }
          }
        });

        // Final filter: Remove any conversations with deleted/archived status
        // (shouldn't happen if backend filtering works, but defensive check)
        const finalConversations = mergedConversations.filter((conv) => {
          if (!conv.id) return false;

          // Always keep current conversation, even if deleted (user is viewing it)
          if (conv.id === state.conversationId) return true;

          // Remove deleted/archived conversations
          const isArchived =
            conv.is_archived === true ||
            conv.is_archived === 1 ||
            conv.is_archived === "1";
          const isDeleted = conv.status === "deleted";
          return !isDeleted && !isArchived;
        });

        // Final sort by updated_at DESC
        finalConversations.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA; // Descending order
        });

        state.conversations = finalConversations;
        state.conversationsStatus = "succeeded";
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.conversationsStatus = "failed";
        state.error = action.payload;
      })
      // getImportantMessages Thunk
      .addCase(getImportantMessages.pending, (state) => {
        state.importantMessagesStatus = "loading";
      })
      .addCase(getImportantMessages.fulfilled, (state, action) => {
        state.importantMessages = action.payload;
        state.importantMessagesStatus = "succeeded";
        console.log(
          " Important messages updated:",
          action.payload.length,
          "messages"
        );
      })
      .addCase(getImportantMessages.rejected, (state, action) => {
        state.importantMessagesStatus = "failed";
        state.error = action.payload;
        console.error(" Failed to get important messages:", action.payload);
      })
      // deleteConversation Thunk
      .addCase(deleteConversation.pending, (state) => {
        state.deleteStatus = "loading";
        state.error = null;
      })
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.error = null;

        // Remove the deleted conversation from the list
        const deletedId = action.payload;
        console.log("Reducer: Removing conversation from list:", deletedId);

        state.conversations = state.conversations.filter(
          (conv) => conv.id !== deletedId
        );

        // If the deleted conversation was the current one, clear chat state
        if (state.conversationId === deletedId) {
          console.log("Reducer: Clearing chat state for deleted conversation");
          state.conversationId = null;
          state.currentConversation = null;
          state.messages = [];
        }
      })
      .addCase(deleteConversation.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.error = action.payload;
        console.error("Reducer: Delete failed:", action.payload);
      })
      // deleteMessage Thunk
      .addCase(deleteMessage.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        // Remove the deleted message from the current messages
        state.messages = state.messages.filter(
          (msg) => msg.id !== action.payload
        );
        // Remove from important messages if it was there
        state.importantMessages = state.importantMessages.filter(
          (msg) => msg.id !== action.payload
        );
        state.status = "succeeded";
        toast.success("Message deleted successfully");
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        toast.error(action.payload || "Failed to delete message");
      })
      // updateConversation Thunk
      .addCase(updateConversation.fulfilled, (state, action) => {
        const { conversationId, title } = action.payload;
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (conv) conv.title = title;
      })
      // markMessageImportant Thunk - FIXED
      .addCase(markMessageImportant.pending, (state) => {
        state.importanceOperationStatus = "loading";
      })

      .addCase(markMessageImportant.fulfilled, (state, action) => {
        state.importanceOperationStatus = "succeeded";

        const { messageId, isImportant } = action.payload;

        const message = state.messages.find(
          (m) => String(m.id) === String(messageId)
        );

        if (message) {
          message.isImportant = isImportant;
        }
      })

      .addCase(markMessageImportant.rejected, (state, action) => {
        state.importanceOperationStatus = "failed";
        state.error = action.payload;
      })

      // unmarkMessageImportant Thunk - FIXED
      .addCase(unmarkMessageImportant.pending, (state, action) => {
        state.importanceOperationStatus = "loading";
        const messageId = action.meta.arg;

        // Update the local message state optimistically
        const message = state.messages.find(
          (m) => String(m.id) === String(messageId)
        );
        if (message) {
          message.isImportant = false;
        }
      })
      .addCase(unmarkMessageImportant.fulfilled, (state, action) => {
        state.importanceOperationStatus = "succeeded";

        const { messageId, isImportant } = action.payload;

        const message = state.messages.find((m) => m.id === messageId);
        if (message) {
          message.isImportant = isImportant;
        }
      })

      .addCase(unmarkMessageImportant.rejected, (state, action) => {
        state.importanceOperationStatus = "failed";
        state.error = action.payload;
        const messageId = action.meta.arg;

        // Rollback optimistic update on failure
        const message = state.messages.find(
          (m) => String(m.id) === String(messageId)
        );
        if (message) {
          message.isImportant = true;
        }

        toast.error(action.payload || "Failed to unmark message as important");
        console.error(
          " Error unmarking message as important:",
          action.payload
        );
      })
      .addCase(updateImportantMessageTitle.fulfilled, (state, action) => {
        const { messageId, title } = action.payload;
        const msg = state.importantMessages.find((m) => m.id === messageId);
        if (msg) msg.title = title;
      })
      .addCase(updateImportantMessageTitle.rejected, (state, action) => {
        toast.error(
          action.payload || "Failed to update important message title"
        );
      })
      // generateVisualization Thunk - FIXED
      .addCase(generateVisualization.pending, (state) => {
        state.status = "loading";
      })
      .addCase(generateVisualization.fulfilled, (state, action) => {
        state.status = "succeeded";

        //  FIX: extract from payload
        const visualizationData = action.payload?.visualization;
        const messageId = action.payload?.aiMessageId;

        console.log("📊 Visualization fulfilled:", {
          hasVisualization: !!visualizationData,
          messageId,
        });

        if (!visualizationData) return;

        // 🎯 Prefer attaching by messageId (MOST reliable)
        if (messageId) {
          const message = state.messages.find((m) => m.id === messageId);
          if (message) {
            message.visualization = visualizationData;
            return;
          }
        }

        // 🔁 Fallback: attach to last AI message
        for (let i = state.messages.length - 1; i >= 0; i--) {
          if (state.messages[i].role === "ai") {
            state.messages[i].visualization = visualizationData;
            break;
          }
        }
      })

      .addCase(generateVisualization.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        toast.error("Failed to generate visualization");
        console.error(" generateVisualization.rejected:", action.payload);
      })
      // getVisualizations Thunk
      .addCase(getVisualizations.pending, (state) => {
        state.visualizationsStatus = "loading";
      })
      // getVisualization Thunk
      .addCase(getVisualizations.fulfilled, (state, action) => {
  const visualizations = action.payload || [];
  console.log(" getVisualizations.fulfilled - Received:", {
    count: visualizations.length,
    firstViz: visualizations[0] ? {
      id: visualizations[0].id,
      message_id: visualizations[0].message_id,
      chart_type: visualizations[0].chart_type,
      has_data: !!visualizations[0].chart_data,
      data_preview: visualizations[0].chart_data?.substring(0, 100) + '...'
    } : 'none'
  });

  // Store raw visualizations
  state.visualizations = visualizations;
  state.visualizationsStatus = "succeeded";

  // 🔥 Parse and normalize immediately
  const normalizedVisualizations = visualizations.map(viz => {
    // Clone the visualization
    const normalized = { ...viz };
    
    // Parse chart_data if it's JSON
    if (viz.chart_data && typeof viz.chart_data === 'string') {
      const chartData = viz.chart_data.trim();
      if (chartData.startsWith('{')) {
        try {
          const parsed = JSON.parse(chartData);
          normalized.chart_data = parsed.data; // Extract base64
          normalized.chart_type = parsed.type || viz.chart_type;
          if (parsed.title) normalized.title = parsed.title;
        } catch (e) {
          console.warn(`Failed to parse JSON for viz ${viz.id}:`, e);
        }
      }
    }
    
    return normalized;
  });

  // 🔥 CRITICAL: Immediately merge into messages
  if (normalizedVisualizations.length > 0 && state.messages.length > 0) {
    console.log("🔄 Immediately merging visualizations into messages...");
    
    const vizMap = {};
    normalizedVisualizations.forEach(viz => {
      const messageId = viz.message_id;
      if (messageId && viz.chart_data) {
        vizMap[messageId] = {
          type: viz.chart_type,
          data: viz.chart_data,
          title: viz.title,
          query: viz.query_used,
          createdAt: viz.created_at
        };
      }
    });

    // Update messages
    let mergeCount = 0;
    state.messages = state.messages.map(message => {
      const messageId = message.id;
      const visualization = vizMap[messageId];
      
      if (visualization && visualization.data) {
        // Only update if message doesn't have visualization or needs better data
        const needsUpdate = !message.visualization || 
                           !message.visualization.data || 
                           (message.visualization.data && message.visualization.data.length < 100);
        
        if (needsUpdate) {
          mergeCount++;
          console.log(` Attaching visualization to message ${messageId}:`, {
            type: visualization.type,
            dataLength: visualization.data.length
          });
          
          return {
            ...message,
            visualization: visualization
          };
        }
      }
      
      return message;
    });
    
    console.log(` Merged ${mergeCount} visualizations into messages`);
    
    // Force a state change by updating a timestamp
    state.lastVisualizationMerge = Date.now();
  }
})

      // toggleFavoriteVisualization Thunk
      .addCase(toggleFavoriteVisualization.fulfilled, (state, action) => {
        const { visualizationId, isFavorite } = action.payload;
        const visualization = state.visualizations.find(
          (v) => v.id === visualizationId
        );
        if (visualization) {
          visualization.is_favorite = isFavorite;
        }
        if (
          state.currentVisualization &&
          state.currentVisualization.id === visualizationId
        ) {
          state.currentVisualization.is_favorite = isFavorite;
        }
        toast.success(
          isFavorite ? "Added to favorites" : "Removed from favorites"
        );
      })
      .addCase(toggleFavoriteVisualization.rejected, (state, action) => {
        state.error = action.payload;
        toast.error(action.payload || "Failed to update favorite status");
      })
      // deleteVisualization Thunk
      .addCase(deleteVisualization.fulfilled, (state, action) => {
        const { visualizationId } = action.payload;
        state.visualizations = state.visualizations.filter(
          (v) => v.id !== visualizationId
        );
        if (
          state.currentVisualization &&
          state.currentVisualization.id === visualizationId
        ) {
          state.currentVisualization = null;
        }
        toast.success("Visualization deleted successfully");
      })
      .addCase(deleteVisualization.rejected, (state, action) => {
        state.error = action.payload;
        toast.error(action.payload || "Failed to delete visualization");
      });
  },
});

export const {
  addHumanMessage,
  addAiMessage,
  clearChat,
  setCurrentConversation,
  updateMessageImportance,
  cancelChat,
} = chatSlice.actions;
export default chatSlice.reducer;
