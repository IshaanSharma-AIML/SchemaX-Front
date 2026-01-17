// Chat interface page component
// Main chat interface for interacting with AI, managing conversations, and viewing visualizations
'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useSearchParams } from 'next/navigation';
import { sendMessage, addHumanMessage, addAiMessage, clearChat, getVisualizations, getChatHistory, markMessageImportant, unmarkMessageImportant, deleteMessage, getImportantMessages, getConversations, generateVisualization, cancelChatRequest } from '@/lib/store/users-panel/chat/chatSlice';
import { FaRobot, FaPaperPlane, FaUser, FaStar, FaChevronDown, FaTrash, FaChartBar, FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute, FaPause, FaPlay, FaStop } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProjects } from '@/lib/store/users-panel/projects/projectSlice';
import { format, isValid, isToday, isYesterday } from 'date-fns';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { toast } from 'react-hot-toast';

// Enhanced Visualization Component with Labels
const VisualizationComponent = ({ visualization }) => {
  // DEBUG: Log what we're receiving
  console.log("🔍 VisualizationComponent received:", {
    visualization,
    keys: visualization ? Object.keys(visualization) : 'no visualization',
    hasData: visualization?.data || visualization?.chart_data,
    dataType: typeof (visualization?.data || visualization?.chart_data),
    nestedViz: visualization?.visualization
  });

  // Handle multiple possible data structures
  const getVisualizationData = () => {
    if (!visualization) {
      console.log(" No visualization data provided");
      return null;
    }

    // Case 1: Direct data (base64 string)
    if (visualization.data) {
      console.log(" Case 1: Direct data property");
      return {
        type: visualization.type || 'chart',
        data: visualization.data,
        title: visualization.title || 'Chart',
        query: visualization.query
      };
    }

    // Case 2: chart_data property (common in backend responses)
    if (visualization.chart_data) {
      console.log(" Case 2: chart_data property");
      return {
        type: visualization.chart_type || visualization.type || 'chart',
        data: visualization.chart_data,
        title: visualization.title,
        query: visualization.query_used || visualization.query
      };
    }

    // Case 3: Nested visualization object
    if (visualization.visualization) {
      console.log(" Case 3: Nested visualization property");
      const viz = visualization.visualization;
      return {
        type: viz.type || viz.chart_type || 'chart',
        data: viz.data || viz.chart_data,
        title: viz.title || visualization.title,
        query: viz.query || viz.query_used || visualization.query
      };
    }

    // Case 4: The data might be in a different property
    console.log("⚠️ Could not find data in expected properties");
    return null;
  };

  const vizData = getVisualizationData();
  
  if (!vizData || !vizData.data) {
    console.log(" No valid visualization data to render");
    return null;
  }

  // Verify data is base64
  const isBase64 = typeof vizData.data === 'string' && 
                  (vizData.data.startsWith('data:image/') || 
                   vizData.data.length > 100 && /[A-Za-z0-9+/=]/.test(vizData.data));
  
  console.log(" Visualization data ready:", {
    type: vizData.type,
    dataLength: vizData.data?.length,
    isBase64: isBase64,
    preview: vizData.data?.substring(0, 50) + '...'
  });

  // Get chart type info
  const getChartTypeInfo = (chartType) => {
    const types = {
      bar: { icon: "📊", label: "Bar Chart", color: "blue" },
      pie: { icon: "🥧", label: "Pie Chart", color: "green" },
      line: { icon: "📈", label: "Line Chart", color: "purple" },
      scatter: { icon: "🔍", label: "Scatter Plot", color: "orange" },
      histogram: { icon: "📊", label: "Histogram", color: "red" },
      chart: { icon: "📊", label: "Chart", color: "blue" },
    };
    return types[chartType?.toLowerCase()] || { icon: "📊", label: "Visualization", color: "blue" };
  };

  const chartTypeInfo = getChartTypeInfo(vizData.type);
  const chartTypeColor = chartTypeInfo.color;

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header with Chart Type Label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{chartTypeInfo.icon}</span>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {chartTypeInfo.label}
          </h4>
          <span
            className={`px-2 py-1 text-xs rounded-full bg-${chartTypeColor}-100 text-${chartTypeColor}-800 dark:bg-${chartTypeColor}-900 dark:text-${chartTypeColor}-200`}
          >
            {vizData.type?.toUpperCase() || "CHART"}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Generated Chart
        </div>
      </div>

      {/* Visualization Image */}
      <div className="flex justify-center mb-3">
        <div className="relative">
          {/* Handle both base64 string and data URL */}
          <img
            src={
              vizData.data.startsWith('data:image/') 
                ? vizData.data 
                : `data:image/png;base64,${vizData.data}`
            }
            alt={vizData.title || "Data Visualization"}
            className="max-w-full h-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-600"
            style={{ maxHeight: "400px" }}
            onError={(e) => {
              console.error(" Failed to load image:", e);
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `
                <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                  <p class="font-medium">Failed to load chart image</p>
                  <p class="text-sm mt-1">Data format may be invalid</p>
                  <p class="text-xs mt-2">Data preview: ${vizData.data?.substring(0, 100)}...</p>
                </div>
              `;
            }}
            onLoad={() => console.log(" Chart image loaded successfully")}
          />
          {/* Overlay label */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {chartTypeInfo.label}
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="space-y-2">
        {vizData.title && (
          <div className="flex items-start space-x-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-0.5">
              Title:
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">
              {vizData.title}
            </p>
          </div>
        )}

        {vizData.query && (
          <div className="flex items-start space-x-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-0.5">
              Query:
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex-1 italic">
              "{vizData.query.length > 100 ? vizData.query.substring(0, 100) + '...' : vizData.query}"
            </p>
          </div>
        )}

        {/* Chart Type Badge */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Chart Type:
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${chartTypeColor}-100 text-${chartTypeColor}-800 dark:bg-${chartTypeColor}-900 dark:text-${chartTypeColor}-200`}
            >
              {chartTypeInfo.icon} {chartTypeInfo.label}
            </span>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Interactive
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced CSS for modern LLM-like interface
const modernLLMStyles = `
  .typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #6b7280;
    animation: typing 1.4s infinite ease-in-out;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-8px);
      opacity: 1;
    }
  }

  /* Modern scrollbar - always visible */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.4);
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.6);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.4);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.6);
  }

  /* Message animations */
  .message-enter {
    opacity: 0;
    transform: translateY(10px);
    animation: messageSlideIn 0.3s ease-out forwards;
  }

  @keyframes messageSlideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Input focus effects */
  .chat-input:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .dark .chat-input:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  /* Hide scrollbar for textarea */
  .chat-input::-webkit-scrollbar {
    display: none;
  }

  .chat-input {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  /* Smooth transitions */
  .message-bubble {
    transition: all 0.2s ease;
  }

  .message-bubble:hover {
    transform: translateY(-1px);
  }

  /* Modern button styles */
  .send-button {
    transition: all 0.2s ease;
  }

  .send-button:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .send-button:active {
    transform: scale(0.95);
  }
`;

// Helper function to format text with bold formatting
// const formatWithBold = (text) => {
//     if (!text || typeof text !== 'string') return text;

//     let formatted = text;

//     // Helper to check if text is already wrapped in strong tag
//     // Uses a closure to access the current formatted string
//     const createBoldChecker = (currentString) => {
//         return (offset) => {
//             if (!currentString || typeof currentString !== 'string') return false;
//             const before = currentString.substring(Math.max(0, offset - 30), offset);
//             return before.includes('<strong>') && !before.includes('</strong>');
//         };
//     };

//     // Make years bold first (4-digit years like 2022, 2023, etc.)
//     const checkBold1 = createBoldChecker(formatted);
//     formatted = formatted.replace(/\b(19|20)\d{2}\b/g, (match, p1, offset) => {
//         if (!checkBold1(offset)) {
//             return `<strong>${match}</strong>`;
//         }
//         return match;
//     });

//     // Make months bold (January, February, etc.)
//     const months = ['January', 'February', 'March', 'April', 'May', 'June',
//                     'July', 'August', 'September', 'October', 'November', 'December'];
//     months.forEach(month => {
//         const regex = new RegExp(`\\b${month}\\b`, 'gi');
//         const checkBold2 = createBoldChecker(formatted);
//         formatted = formatted.replace(regex, (match, offset) => {
//             if (!checkBold2(offset)) {
//                 return `<strong>${match}</strong>`;
//             }
//             return match;
//         });
//     });

//     // Make other numbers bold (but not years which are already done)
//     const checkBold3 = createBoldChecker(formatted);
//     formatted = formatted.replace(/\b(\d+)\b/g, (match, p1, offset) => {
//         // Skip if it's a 4-digit year (already handled)
//         if (/^\d{4}$/.test(match) && (match.startsWith('19') || match.startsWith('20'))) {
//             return match;
//         }
//         if (!checkBold3(offset)) {
//             return `<strong>${match}</strong>`;
//         }
//         return match;
//     });

//     // Make common important words/phrases bold
//     const importantPhrases = [
//         'employees', 'employee', 'hired', 'hiring', 'months', 'month',
//         'analyze', 'analysis', 'factors', 'patterns', 'concentrated',
//         'data', 'results', 'total', 'average', 'percentage', 'percent',
//         'year', 'years', 'quarter', 'quarters', 'week', 'weeks', 'day', 'days'
//     ];

//     importantPhrases.forEach(phrase => {
//         const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
//         const checkBold4 = createBoldChecker(formatted);
//         formatted = formatted.replace(regex, (match, offset) => {
//             if (!checkBold4(offset)) {
//                 return `<strong>${match}</strong>`;
//             }
//             return match;
//         });
//     });

//     return formatted;
// };

// // Helper function to convert text into bullet points and extract greeting
// const convertToBulletPoints = (text) => {
//     if (!text || typeof text !== 'string') return { greeting: null, bulletPoints: [] };

//     // Split by newlines first to handle multi-line greetings
//     let lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

//     // Extract greeting lines from the beginning
//     const greetingPatterns = [
//         /^👋\s*Hello\s*[!.]?$/i,
//         /^Welcome\s+to\s*\([^)]+\)\s*[!.]?$/i,
//         /^Welcome\s*to\s*\([^)]+\)\s*[!.]?$/i,
//         /^Welcome\s*[!.]?$/i,
//         /^Welcome\s+to\s*[!.]?$/i
//     ];

//     // Extract greeting lines
//     let greeting = null;
//     const greetingLines = [];
//     while (lines.length > 0 && greetingPatterns.some(pattern => pattern.test(lines[0]))) {
//         greetingLines.push(lines.shift());
//     }

//     // Join greeting lines if any were found
//     if (greetingLines.length > 0) {
//         greeting = greetingLines.join(' ');
//     }

//     // Also check for greeting at the start of the text (in case it's not on a separate line)
//     if (!greeting) {
//         const greetingMatch = text.match(/^(👋\s*Hello|Welcome\s+to\s*\([^)]+\)|Welcome\s*to\s*\([^)]+\)|Welcome)\s*[!.]?\s*/i);
//         if (greetingMatch) {
//             greeting = greetingMatch[0].trim();
//         }
//     }

//     // Join back and clean up remaining text
//     let cleanedText = lines.join('\n')
//         // Also remove any remaining greeting patterns in the text
//         .replace(/^👋\s*Hello\s*[!.]?\s*/i, '')
//         .replace(/^Welcome\s+to\s*\([^)]+\)\s*[!.]?\s*/i, '')
//         .replace(/^Welcome\s*to\s*\([^)]+\)\s*[!.]?\s*/i, '')
//         .replace(/^Welcome\s*[!.]?\s*/i, '')
//         .replace(/^Welcome\s+to\s*\([^)]+\)\s*[!.]?\s*/i, '')
//         .replace(/^[!.\s]+/, '')
//         .trim();

//     // Re-split after cleaning
//     lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

//     // If we have multiple lines, use them as bullet points
//     if (lines.length > 1) {
//         return {
//             greeting: greeting,
//             bulletPoints: lines.map(line => line.trim()).filter(line => line.length > 0)
//         };
//     }

//     // If no newlines, split by sentences (periods, exclamation, question marks)
//     // Use a regex that captures the sentence ending punctuation
//     const sentences = cleanedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

//     if (sentences.length > 1) {
//         return {
//             greeting: greeting,
//             bulletPoints: sentences.map(s => s.trim()).filter(s => s.length > 0)
//         };
//     }

//     // If still only one item, try splitting by common separators (but only if it makes sense)
//     if (cleanedText.includes(',') || cleanedText.includes(';')) {
//         const parts = cleanedText.split(/[,;]\s+/).filter(p => p.trim().length > 0);
//         if (parts.length > 1) {
//             return {
//                 greeting: greeting,
//                 bulletPoints: parts.map(p => p.trim()).filter(p => p.length > 0)
//             };
//         }
//     }

//     // If all else fails, return the cleaned text as a single bullet point
//     return {
//         greeting: greeting,
//         bulletPoints: cleanedText ? [cleanedText] : []
//     };
// };

// Modern LLM-style MessageBubble Component
// Modern LLM-style MessageBubble Component
const MessageBubble = ({
  message,
  aiAgentName,
  onToggleImportance,
  isImportant,
  isMarkingImportant = false,
  tts,
  currentSpeakingId,
  onSpeak,
}) => {
  const isAi = message.role === "ai";

  // Add debug logging for visualizations
  useEffect(() => {
    if (isAi && message.visualization) {
      console.log("MessageBubble - Visualization data:", {
        messageId: message.id,
        hasVisualization: !!message.visualization,
        visualizationType:
          message.visualization?.type ||
          message.visualization?.visualization?.type,
        dataLength:
          message.visualization?.data?.length ||
          message.visualization?.visualization?.data?.length,
        keys: Object.keys(message.visualization),
        hasChartData: !!message.visualization.chart_data,
        chartDataLength: message.visualization.chart_data?.length,
        hasChartType: !!message.visualization.chart_type,
        hasVisualizationObject: !!message.visualization.visualization,
      });
    }
  }, [isAi, message.visualization, message.id]);

  // Modern LLM-style layout - full width with centered content
  const containerClasses = "w-full flex justify-center";
  const bubbleAlignmentClasses = isAi ? "flex-row" : "flex-row-reverse";

  // Modern avatar styling - more subtle
  const iconContainerClasses = isAi
    ? "bg-gradient-to-br from-blue-500 to-indigo-600"
    : "bg-gradient-to-br from-gray-600 to-gray-700";

  // Modern bubble styling - cleaner, more minimal (ChatGPT/Claude style)
  const bubbleClasses = isAi
    ? `message-bubble rounded-2xl bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 ${
        message.isError ? "border-red-300 dark:border-red-600" : ""
      } ${isImportant ? "ring-2 ring-yellow-400 dark:ring-yellow-500" : ""}`
    : `message-bubble rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 ${
        isImportant ? "ring-2 ring-yellow-400 dark:ring-yellow-500" : ""
      }`;

  const authorTextClasses = isAi
    ? "text-gray-600 dark:text-gray-400"
    : "text-gray-600 dark:text-gray-400";

  const proseClasses = isAi
    ? "prose prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 dark:prose-invert prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-a:text-blue-600 dark:prose-a:text-blue-400"
    : "prose prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 dark:prose-invert prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-a:text-blue-600 dark:prose-a:text-blue-400";

  const handleStarClick = (e) => {
    e.stopPropagation();
    if (onToggleImportance && message.id) {
      onToggleImportance(message.id, !isImportant);
    }
  };

  // Format date and time according to device's local timezone and locale
  const dateString = message.createdAt || message.created_at;

  // Parse date string - handle both ISO format with/without timezone
  let dateObj;
  if (typeof dateString === "string") {
    // If the string doesn't end with Z or have timezone, assume UTC
    const normalizedDate =
      dateString.endsWith("Z") ||
      dateString.includes("+") ||
      dateString.includes("-", 10)
        ? dateString
        : dateString + "Z";
    dateObj = new Date(normalizedDate);
  } else if (dateString instanceof Date) {
    dateObj = dateString;
  } else {
    dateObj = new Date(dateString);
  }

  const formattedDateTime = (() => {
    if (!isValid(dateObj) || isNaN(dateObj.getTime())) return "";

    const now = new Date();
    const diffInMinutes = Math.floor((now - dateObj) / (1000 * 60));

    // Show relative time for recent messages (within last hour)
    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    // Show time for today's messages
    if (isToday(dateObj)) {
      return format(dateObj, "h:mm a"); // e.g., "2:30 PM"
    }

    // Show "Yesterday" for yesterday's messages
    if (isYesterday(dateObj)) {
      return `Yesterday ${format(dateObj, "h:mm a")}`;
    }

    // Show date and time for older messages
    const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
    if (diffInDays < 7) {
      return format(dateObj, "EEE h:mm a"); // e.g., "Mon 2:30 PM"
    }

    // Show full date for older messages
    return format(dateObj, "MMM d, h:mm a"); // e.g., "Jan 15, 2:30 PM"
  })();

  return (
    <div className={`message mb-6 flex ${containerClasses} message-enter`}>
      <div
        className={`flex items-start gap-4 w-full px-4 sm:px-6 ${bubbleAlignmentClasses}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconContainerClasses} shadow-sm`}
        >
          {isAi ? (
            <FaRobot className="text-white text-sm" />
          ) : (
            <FaUser className="text-white text-sm" />
          )}
        </div>
        <div className={`relative px-5 py-4 group max-w-2xl ${bubbleClasses}`}>
          <div className={`text-xs font-semibold mb-3 ${authorTextClasses}`}>
            {isAi ? aiAgentName : "You"}
          </div>
          <div className={proseClasses}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>

            {/* Visualization Component with Debug Info */}
            {isAi && message.visualization && (
              <div className="mt-4">
                <VisualizationComponent visualization={message.visualization} />
                
                {/* Debug info - only show in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    <details>
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                        Debug: Visualization Data
                      </summary>
                      <pre className="mt-1 text-xs overflow-auto">
                        {JSON.stringify({
                          messageId: message.id,
                          hasVisualization: !!message.visualization,
                          keys: Object.keys(message.visualization),
                          type: message.visualization.type,
                          dataLength: message.visualization.data?.length,
                          chartType: message.visualization.chart_type,
                          chartDataLength: message.visualization.chart_data?.length,
                          hasVisualizationObject: !!message.visualization.visualization,
                          visualizationObjectKeys: message.visualization.visualization 
                            ? Object.keys(message.visualization.visualization) 
                            : null,
                          // Show first 100 chars of data to verify format
                          dataPreview: message.visualization.data 
                            ? message.visualization.data.substring(0, 100) + '...' 
                            : null,
                          chartDataPreview: message.visualization.chart_data 
                            ? message.visualization.chart_data.substring(0, 100) + '...' 
                            : null
                        }, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Timestamp and actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/50">
            <div
              className="text-xs text-gray-400 dark:text-gray-500 cursor-help"
              title={isValid(dateObj) ? format(dateObj, "PPpp") : ""} // Full date/time on hover
            >
              {formattedDateTime}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Text-to-Speech Button (only for AI messages) */}
              {isAi && tts?.isSupported && (
                <button
                  onClick={() => onSpeak && onSpeak(message)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    currentSpeakingId === message.id
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                      : "text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  }`}
                  title={
                    currentSpeakingId === message.id
                      ? tts.isPaused
                        ? "Resume reading"
                        : "Pause reading"
                      : "Read aloud"
                  }
                >
                  {currentSpeakingId === message.id ? (
                    tts.isPaused ? (
                      <FaPlay className="w-3.5 h-3.5" />
                    ) : (
                      <FaPause className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <FaVolumeUp className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {/* Star Button */}
              {message.id && message.id !== null && (
                <button
                  onClick={handleStarClick}
                  disabled={isMarkingImportant}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isImportant
                      ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
                      : "text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  } ${isMarkingImportant ? "opacity-50 cursor-wait" : ""}`}
                  title={
                    isImportant ? "Remove from important" : "Mark as important"
                  }
                >
                  {isMarkingImportant ? (
                    <span className="w-3.5 h-3.5 border-2 border-yellow-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                  ) : (
                    <FaStar
                      className={`w-3.5 h-3.5 ${
                        isImportant ? "fill-current" : ""
                      }`}
                    />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to display messages in chronological order
function getMessagesInOrder(messages) {
    // Ensure messages are in chronological order by created_at
    const sortedMessages = [...messages].sort((a, b) => {
        const parseDate = (d) => {
            const date = new Date(d);
            return isNaN(date.getTime()) ? new Date('1970-01-01T00:00:00Z') : date;
        };
        const dateA = parseDate(a.createdAt || a.created_at);
        const dateB = parseDate(b.createdAt || b.created_at);
        if (dateA - dateB !== 0) return dateA - dateB;
        // If timestamps are equal, show human before ai
        if (a.role === 'human' && b.role === 'ai') return -1;
        if (a.role === 'ai' && b.role === 'human') return 1;
        // As a last resort, sort by id (string compare)
        return (a.id || '').localeCompare(b.id || '');
    });
    return sortedMessages;
}

// Main ChatPage Component
const ChatPageContent = () => {
    const [inputValue, setInputValue] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [responseProgress, setResponseProgress] = useState(0);
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);
    const prevConversationIdRef = useRef(null);
    const progressIntervalRef = useRef(null);
    
    // Voice recognition hook
    const {
        isListening,
        transcript,
        error: voiceError,
        isSupported: isVoiceSupported,
        startListening,
        stopListening,
        resetTranscript,
    } = useVoiceRecognition();

    // Text-to-speech hook
    const tts = useTextToSpeech();
    const [currentSpeakingId, setCurrentSpeakingId] = useState(null);
    const [autoReadEnabled, setAutoReadEnabled] = useState(false);

    const dispatch = useDispatch();
    const routerParams = useParams();
    const searchParams = useSearchParams();
    const { projectId } = routerParams;
    
    // Get conversationId from URL query parameters
    const urlConversationId = searchParams.get('conversationId');
    const isNewChat = searchParams.get('new') === '1';
    

    const { projects, status: projectStatus } = useSelector((state) => state.projects);
    const { messages, status, conversationId, currentConversation, importantMessages = [], error, conversations = [], conversationsStatus, importanceOperationStatus } = useSelector((state) => state.chat);
    const isLoading = status === 'loading'; // Only for AI responses, not importance operations
    
    // Use URL conversationId if available, otherwise use state conversationId
    const activeConversationId = urlConversationId || conversationId;
    
    // Update URL when conversationId changes (for new conversations only)
    // Don't update if URL already has a conversationId (user navigated explicitly)
    // This prevents race conditions when user clicks on a conversation in sidebar
    useEffect(() => {
        // Only update URL if:
        // 1. We have a conversationId from Redux
        // 2. URL doesn't have a conversationId (new chat scenario)
        // 3. It's not a new chat
        // 4. We're not loading
        // 5. We have messages (conversation was created)
        if (conversationId && !urlConversationId && !isNewChat && !isLoading && messages.length > 0 && projectId) {
                // This is a newly created conversation - mark it and update URL after delay
                newlyCreatedConversationRef.current = conversationId;
                setTimeout(() => {
                // Only update if URL still doesn't have a conversationId (user didn't navigate away)
                if (!searchParams.get('conversationId')) {
                    const newUrl = `/user/${projectId}/chat?conversationId=${conversationId}`;
                    window.history.replaceState({}, '', newUrl);
                    // Clear the newly created flag after a longer delay
                    setTimeout(() => {
                        if (newlyCreatedConversationRef.current === conversationId) {
                            newlyCreatedConversationRef.current = null;
                        }
                    }, 5000);
                }
                }, 1500); // Longer delay to ensure backend has committed
        }
    }, [conversationId, urlConversationId, isNewChat, isLoading, messages.length, projectId, searchParams]);
    
    // Realistic progress simulation - progresses slowly and naturally
    useEffect(() => {
        if (isLoading) {
            // Reset progress when loading starts
            setResponseProgress(0);
            let currentProgress = 0;
            const startTime = Date.now();
            
            // More realistic progress simulation - progresses slowly and naturally
            const updateProgress = () => {
                // Calculate elapsed time
                const elapsed = (Date.now() - startTime) / 1000; // seconds
                
                // Progress based on time - more realistic progression
                // Most queries take 10-30 seconds, so we'll progress over that time
                // Cap at 90% to leave room for final processing
                let targetProgress = 0;
                
                if (elapsed < 5) {
                    // Initial phase (0-5s): Quick start to 15%
                    targetProgress = Math.min(15, (elapsed / 5) * 15);
                } else if (elapsed < 15) {
                    // Middle phase (5-15s): Steady progress to 60%
                    targetProgress = 15 + ((elapsed - 5) / 10) * 45; // 15% to 60%
                } else if (elapsed < 30) {
                    // Processing phase (15-30s): Slower progress to 85%
                    targetProgress = 60 + ((elapsed - 15) / 15) * 25; // 60% to 85%
                } else {
                    // Long processing (30s+): Very slow progress to 90%
                    targetProgress = Math.min(90, 85 + ((elapsed - 30) / 30) * 5); // 85% to 90%
                }
                
                // Smooth transition to target progress
                const diff = targetProgress - currentProgress;
                if (Math.abs(diff) > 0.1) {
                    // Smooth interpolation
                    currentProgress += diff * 0.3; // 30% of the way to target each update
                    currentProgress = Math.min(currentProgress, 90); // Cap at 90%
                setResponseProgress(currentProgress);
                }
                
                // Continue if still loading
                if (isLoading && currentProgress < 90) {
                    // Update every 500ms for smooth progress
                    progressIntervalRef.current = setTimeout(updateProgress, 500);
                }
            };
            
            // Start progress with initial delay
            progressIntervalRef.current = setTimeout(updateProgress, 200);
            
            return () => {
                if (progressIntervalRef.current) {
                    clearTimeout(progressIntervalRef.current);
                }
            };
        } else {
            // When loading completes, quickly finish to 100% then reset
            if (responseProgress > 0 && responseProgress < 100) {
                setResponseProgress(100);
                setTimeout(() => {
                    setResponseProgress(0);
                }, 500);
            }
            if (progressIntervalRef.current) {
                clearTimeout(progressIntervalRef.current);
            }
        }
    }, [isLoading]); // Remove responseProgress from dependencies to avoid re-triggering
    
    const currentProject = projects.find(p => p.id === projectId);
    const agentName = currentProject?.bot_name || 'AI Business Agent';
    
    // Use conversation title if available, otherwise fallback to agent name
    const chatHeaderTitle = currentConversation?.title || agentName;
    
    useEffect(() => {
        if (projectStatus === 'idle') {
            dispatch(getProjects());
        }

        // Clear chat if starting a new chat
        if (isNewChat) {
            dispatch(clearChat());
            // Clear input field
            setInputValue('');
            // Reset textarea height
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
            // Remove the 'new=1' and 't' (timestamp) parameters from URL after clearing
            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('new');
                    url.searchParams.delete('t'); // Remove timestamp parameter
                    const newUrl = url.pathname + (url.search ? url.search : '');
                    window.history.replaceState({}, '', newUrl);
                }
            }, 100);
        }
        // Note: Chat history loading is handled in the useEffect below to avoid duplicate loads
    }, [projectId, projectStatus, isNewChat, dispatch]);

    // Always fetch important messages when projectId changes (not conversationId)
    useEffect(() => {
        if (projectId) {
            dispatch(getImportantMessages(projectId));
        }
    }, [projectId, dispatch]);

    // Scroll to bottom when component mounts, conversation changes, or messages load
    useEffect(() => {
        if (chatContainerRef.current && messages.length > 0) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }, 100);
        }
    }, [urlConversationId, isNewChat, messages]);

    // Handle scroll events to show/hide scroll button
    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (!chatContainer) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = chatContainer;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userMessage = inputValue.trim();
        
        if (!userMessage) {
            return;
        }

        // Stop voice recognition if it's active
        if (isListening) {
            stopListening();
        }

        // Add optimistic user message
        dispatch(addHumanMessage({ 
            content: userMessage,
            conversationId: activeConversationId || null // Only set if we have one
        }));
        dispatch(sendMessage({
            naturalLanguageQuery: userMessage,
            conversationId: activeConversationId || null, // Pass null/undefined for new chats to let backend create it
            projectId: projectId
        }));

        setInputValue('');
        resetTranscript();
        // Reset textarea height
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    };

    const handleGenerateVisualization = async () => {
        const userMessage = inputValue.trim();
        
        if (!userMessage) {
            return;
        }

        // Stop voice recognition if it's active
        if (isListening) {
            stopListening();
        }

        dispatch(addHumanMessage({ 
            content: userMessage,
            conversationId: activeConversationId || null
        }));
        
        // Add a placeholder AI message for the visualization
        dispatch(addAiMessage({ 
            content: "Generating visualization...", 
            id: `temp-${Date.now()}`,
            visualization: null 
        }));
        
        dispatch(generateVisualization({
            naturalLanguageQuery: userMessage,
            conversationId: activeConversationId || null, // Pass null for new chats
            projectId: projectId
        }));

        setInputValue('');
        resetTranscript();
        // Reset textarea height
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            // Reset height to auto to get the correct scrollHeight
            inputRef.current.style.height = 'auto';
            
            // Calculate new height with a maximum of 128px
            const newHeight = Math.min(inputRef.current.scrollHeight, 128);
            inputRef.current.style.height = newHeight + 'px';
            
            // If content exceeds max height, show scrollbar (but it's hidden via CSS)
            if (inputRef.current.scrollHeight > 128) {
                inputRef.current.style.overflowY = 'auto';
            } else {
                inputRef.current.style.overflowY = 'hidden';
            }
        }
    }, [inputValue]);
    
    // Update input value when transcript changes
    useEffect(() => {
        if (transcript) {
            setInputValue(transcript);
        }
    }, [transcript]);

    // Show error toast when voice recognition fails
    useEffect(() => {
        if (voiceError) {
            toast.error(voiceError);
        }
    }, [voiceError]);

    // Handle voice input toggle
    const handleVoiceToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    // Handle text-to-speech for a message
    const handleSpeakMessage = useCallback((message) => {
        if (!tts.isSupported) {
            toast.error('Text-to-speech is not supported in your browser.');
            return;
        }

        // If this message is already speaking, pause/resume
        if (currentSpeakingId === message.id) {
            if (tts.isPaused) {
                tts.resume();
            } else {
                tts.pause();
            }
            return;
        }

        // Stop any current speech
        if (tts.isSpeaking) {
            tts.stop();
        }

        // Extract text content from message (remove markdown/HTML)
        const textContent = message.content
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[#*_`]/g, '') // Remove markdown formatting
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();

        if (!textContent) {
            toast.error('No text content to read.');
            return;
        }

        setCurrentSpeakingId(message.id);
        tts.speak(textContent, {
            onend: () => {
                setCurrentSpeakingId(null);
            },
            onerror: () => {
                setCurrentSpeakingId(null);
            }
        });
    }, [tts, currentSpeakingId]);

    // Auto-read new AI messages when auto-read is enabled
    useEffect(() => {
        if (!autoReadEnabled || !tts.isSupported) return;

        const aiMessages = messages.filter(m => m.role === 'ai');
        if (aiMessages.length === 0) return;

        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        // Only auto-read if it's a new message (not already speaking)
        if (currentSpeakingId !== lastAiMessage.id && !tts.isSpeaking) {
            // Small delay to ensure message is fully rendered
            const timeoutId = setTimeout(() => {
                handleSpeakMessage(lastAiMessage);
            }, 500);
            
            return () => clearTimeout(timeoutId);
        }
    }, [messages, autoReadEnabled, tts.isSupported, currentSpeakingId, tts.isSpeaking, handleSpeakMessage]);

    const handleToggleImportance = async (messageId, newIsImportant) => {
        // Optimistically update the UI immediately
        // The reducer will handle the actual state update, but we can trigger a re-render
        const action = newIsImportant 
            ? markMessageImportant(messageId)
            : unmarkMessageImportant(messageId);
        
        // Dispatch without awaiting - let optimistic update handle UI
        dispatch(action).then((result) => {
            // Refresh important messages in the background after success
            if ((newIsImportant && markMessageImportant.fulfilled.match(result)) ||
                (!newIsImportant && unmarkMessageImportant.fulfilled.match(result))) {
                // Refresh in background without blocking UI
                if (projectId) {
                    setTimeout(() => {
                        dispatch(getImportantMessages(projectId)).catch(err => {
                            console.error('Failed to refresh important messages:', err);
                        });
                    }, 100); // Small delay to ensure state is updated
                }
            } else if (markMessageImportant.rejected.match(result) || unmarkMessageImportant.rejected.match(result)) {
                // Show error toast if operation failed
                const errorMsg = result.error?.message || result.payload || 'Failed to update importance';
                toast.error(errorMsg);
            }
        }).catch((error) => {
            console.error('Error toggling importance:', error);
            toast.error('Failed to update message importance');
        });
    };

    const handleDeleteMessage = (messageId) => {
        dispatch(deleteMessage(messageId));
    };

    const handleConversationSelect = (conversation) => {
        // This will be handled by the sidebar component
    };

    // Track if this is a new conversation
    const isNewConversationRef = useRef(false);
    const lastConversationIdRef = useRef(activeConversationId);
    
    useEffect(() => {
        // Detect new conversation creation - when conversationId changes from null/undefined to a value
        const prevId = lastConversationIdRef.current;
        const currentId = activeConversationId;
        
        if (!prevId && currentId) {
            // New conversation was created
            isNewConversationRef.current = true;
        } else if (prevId !== currentId) {
            // Conversation changed (user switched conversations)
            isNewConversationRef.current = false;
        }
        
        lastConversationIdRef.current = currentId;
    }, [activeConversationId]);

    // Note: Conversation refresh is handled by Sidebar component
    // No need to refresh here to avoid duplicate fetches and potential conflicts
    // The Sidebar will refresh when a new conversation is created
    
    // Refs for conversation management
    const conversationsRef = useRef(conversations);
    const lastUrlConversationIdRef = useRef(urlConversationId);
    const isLoadingHistoryRef = useRef(false);
    // Track if we just created a new conversation (to avoid fetching immediately)
    const newlyCreatedConversationRef = useRef(null);

    // Update ref when conversations change
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);
    
    // Track when a new conversation is created
    useEffect(() => {
        if (conversationId && conversationId !== newlyCreatedConversationRef.current) {
            // If we have messages, this is a newly created conversation
            // Track it so we don't fetch when URL updates
            if (messages.length > 0) {
                newlyCreatedConversationRef.current = conversationId;
                // Clear after 10 seconds (conversation should be committed by then)
                // Also clear when URL conversationId matches (means it's been loaded)
                setTimeout(() => {
                    if (urlConversationId === conversationId) {
                        newlyCreatedConversationRef.current = null;
                    }
                }, 10000);
            }
        }
    }, [conversationId, messages.length, urlConversationId]);

    // Note: Conversations are loaded by Sidebar component, no need to fetch here
    // This prevents duplicate fetches and race conditions

    // Load chat history when URL conversationId changes (chat pulled from history)
    // IMPORTANT: Don't load if we just created this conversation (avoid race condition)
    useEffect(() => {
        if (projectId && urlConversationId && !isNewChat) {
            // Check if conversation was deleted - if conversationId is cleared but URL still has it
            // This happens when a conversation is deleted while being viewed
            if (!conversationId && urlConversationId && conversations.length > 0) {
                // Conversation was deleted, redirect to new chat or first conversation
                const deletedConversationExists = conversationsRef.current.find(c => c.id === urlConversationId);
                if (!deletedConversationExists) {
                    // Conversation doesn't exist in list, it was deleted
                    if (conversationsRef.current.length > 0) {
                        window.location.replace(`/user/${projectId}/chat?conversationId=${conversationsRef.current[0].id}`);
                    } else {
                        window.location.replace(`/user/${projectId}/chat?new=1`);
                    }
                    return;
                }
            }
            
            // Only fetch chat history if URL conversationId actually changed
            // AND if we're not currently loading a message (to avoid fetching while conversation is being created)
            const urlChanged = lastUrlConversationIdRef.current !== urlConversationId;
            
            if (urlChanged && !isLoadingHistoryRef.current && !isLoading) {
                // Update ref immediately to prevent duplicate fetches
                lastUrlConversationIdRef.current = urlConversationId;
                
                // Check if this is a newly created conversation or we already have messages for it
                // Don't fetch if:
                // 1. It's tracked as newly created
                // 2. It matches the current conversationId in Redux AND we have messages (means we just created/loaded it)
                const isNewlyCreated = newlyCreatedConversationRef.current === urlConversationId;
                const isCurrentConversationWithMessages = conversationId === urlConversationId && messages.length > 0;
                
                if (!isNewlyCreated && !isCurrentConversationWithMessages) {
                    // Check if conversation exists in conversations list before fetching
                    const conversationExists = conversationsRef.current.find(c => c.id === urlConversationId);
                    if (!conversationExists) {
                        // Conversation doesn't exist (was deleted), redirect
                        isLoadingHistoryRef.current = false;
                        if (conversationsRef.current.length > 0) {
                            window.location.replace(`/user/${projectId}/chat?conversationId=${conversationsRef.current[0].id}`);
                        } else {
                            window.location.replace(`/user/${projectId}/chat?new=1`);
                        }
                        return;
                    }
                    
                    // Additional check: Verify conversation is not deleted or archived
                    const conversation = conversationsRef.current.find(c => c.id === urlConversationId);
                    if (conversation) {
                        const isArchived = conversation.is_archived === true || conversation.is_archived === 1 || conversation.is_archived === '1';
                        const isDeleted = conversation.status === 'deleted';
                        if (isDeleted || isArchived) {
                            // Conversation is deleted/archived, redirect
                            console.log('[ChatPage] Conversation is deleted/archived, redirecting:', urlConversationId);
                            isLoadingHistoryRef.current = false;
                            if (conversationsRef.current.length > 0) {
                                // Find first non-deleted conversation
                                const activeConversation = conversationsRef.current.find(c => {
                                    const cArchived = c.is_archived === true || c.is_archived === 1 || c.is_archived === '1';
                                    const cDeleted = c.status === 'deleted';
                                    return !cDeleted && !cArchived;
                                });
                                if (activeConversation) {
                                    window.location.replace(`/user/${projectId}/chat?conversationId=${activeConversation.id}`);
                                } else {
                                    window.location.replace(`/user/${projectId}/chat?new=1`);
                                }
                            } else {
                                window.location.replace(`/user/${projectId}/chat?new=1`);
                            }
                            return;
                        }
                    }
                    
                    // This is an existing conversation from URL (user clicked on sidebar), fetch it
                    isLoadingHistoryRef.current = true;
                    let retryCount = 0;
                    const maxRetries = 2;
                    
                    // Clear messages before loading new conversation to prevent mismatch
                    // This ensures we don't show messages from the previous conversation
                    if (conversationId !== urlConversationId) {
                        dispatch(clearChat());
                    }
                    
                    const fetchConversation = () => {
                        // Store the URL conversation ID we're fetching to verify later
                        const fetchingConversationId = urlConversationId;
                        
                        dispatch(getChatHistory(fetchingConversationId))
                            .then((result) => {
                                if (result.type === 'chat/getHistory/fulfilled') {
                                    // Successfully loaded conversation
                                    const payload = result.payload;
                                    if (payload && payload.conversation) {
                                        // Verify the loaded conversation matches what we requested
                                        if (payload.conversation.id === fetchingConversationId) {
                                            // Double-check messages belong to this conversation
                                            const messages = payload.messages || [];
                                            const validMessages = messages.filter(msg => {
                                                const msgConvId = msg.conversation_id || msg.conversationId;
                                                return !msgConvId || msgConvId === fetchingConversationId;
                                            });
                                            
                                            if (validMessages.length !== messages.length) {
                                                console.warn(`[ChatPage] Filtered out ${messages.length - validMessages.length} messages from wrong conversation`);
                                            }
                                            
                                            isLoadingHistoryRef.current = false;
                                        } else {
                                            console.error('[ChatPage] Conversation ID mismatch:', payload.conversation.id, 'vs', fetchingConversationId);
                                            handleFetchError('Conversation ID mismatch', retryCount);
                                        }
                                    } else {
                                        // Invalid response, retry or redirect
                                        handleFetchError('Invalid conversation data', retryCount);
                                    }
                                } else if (result.type === 'chat/getHistory/rejected') {
                                    // Error loading conversation
                                    const errorPayload = result.payload || {};
                                    const errorMessage = typeof errorPayload === 'string' ? errorPayload : errorPayload.message || 'Failed to load conversation';
                                    console.error('[ChatPage] Failed to load conversation:', errorMessage);
                                    
                                    // Check if conversation was deleted (404 error)
                                    if (errorMessage.includes('not found') || errorMessage.includes('404') || errorMessage.includes('Conversation not found')) {
                                        // Conversation was deleted, redirect immediately
                                        isLoadingHistoryRef.current = false;
                                        if (conversationsRef.current.length > 0) {
                                            window.location.replace(`/user/${projectId}/chat?conversationId=${conversationsRef.current[0].id}`);
                                        } else {
                                            window.location.replace(`/user/${projectId}/chat?new=1`);
                                        }
                                        return;
                                    }
                                    
                                    handleFetchError(errorMessage, retryCount);
                                }
                            })
                            .catch((error) => {
                                console.error('[ChatPage] Error loading conversation:', error);
                                
                                // Check if conversation was deleted (404 error)
                                const errorMsg = error.message || error.toString();
                                if (errorMsg.includes('not found') || errorMsg.includes('404')) {
                                    // Conversation was deleted, redirect immediately
                                    isLoadingHistoryRef.current = false;
                                    if (conversationsRef.current.length > 0) {
                                        window.location.replace(`/user/${projectId}/chat?conversationId=${conversationsRef.current[0].id}`);
                                    } else {
                                        window.location.replace(`/user/${projectId}/chat?new=1`);
                                    }
                                    return;
                                }
                                
                                handleFetchError(error.message || 'Unknown error', retryCount);
                            });
                    };
                    
                    const handleFetchError = (errorMessage, currentRetryCount) => {
                        // Check if conversation exists in the list
                        const existsInList = conversationsRef.current.find(c => c.id === urlConversationId);
                        
                        if (existsInList && currentRetryCount < maxRetries) {
                            // Conversation exists in list but fetch failed - retry after delay
                            retryCount++;
                            setTimeout(() => {
                                fetchConversation();
                            }, 1000 * retryCount); // Exponential backoff
                        } else {
                            // Conversation doesn't exist or max retries reached - redirect
                            isLoadingHistoryRef.current = false;
                            setTimeout(() => {
                                if (conversationsRef.current.length > 0) {
                                    // Redirect to first conversation in list
                                    window.location.replace(`/user/${projectId}/chat?conversationId=${conversationsRef.current[0].id}`);
                                } else {
                                    // No conversations, go to new chat
                                    window.location.replace(`/user/${projectId}/chat?new=1`);
                                }
                            }, 500);
                        }
                    };
                    
                    // Fetch immediately (no delay needed since we're using replace in sidebar)
                            fetchConversation();
                } else {
                    // Newly created conversation or we already have messages - don't fetch
                    // Just mark it as loaded
                    isLoadingHistoryRef.current = false;
                    console.log('[ChatPage] Skipping fetch for newly created conversation or existing messages:', urlConversationId);
                }
            } else if (!urlChanged) {
                // URL didn't change, just ensure ref is set
                lastUrlConversationIdRef.current = urlConversationId;
            }
        } else if (!urlConversationId && !isNewChat) {
            // Reset ref when conversationId is cleared
            lastUrlConversationIdRef.current = null;
        }
    }, [projectId, urlConversationId, isNewChat, isLoading, conversationId, messages.length, conversations.length, dispatch]);
    // 🔥 FETCH VISUALIZATIONS AFTER HISTORY LOAD
useEffect(() => {
  if (!projectId || !activeConversationId) return;

  dispatch(
    getVisualizations({
      projectId,
      conversationId: activeConversationId,
    })
  );
}, [projectId, activeConversationId, dispatch]);

    // Helper to check if a message is important (robust string comparison)
    const isMessageImportant = useCallback((msgId) => {
        if (!msgId || !importantMessages || importantMessages.length === 0) return false;
        // Important messages are full message objects with id being the message ID
        // Backend returns messages with id = message_id, so check both
        return importantMessages.some(impMsg => {
            const impMsgId = impMsg.id || impMsg.message_id;
            return String(impMsgId) === String(msgId);
        });
    }, [importantMessages]);

    // Use messages in their natural chronological order
    const orderedMessages = getMessagesInOrder(messages);

    // Filter out system greetings or bot-initiated messages that are not direct answers
    const filteredMessages = orderedMessages.filter(
        (message) => {
            // Exclude AI messages that are exact system greetings or onboarding
            if (message.role === 'ai' && typeof message.content === 'string') {
                const content = message.content.trim().toLowerCase();
                // Only filter out exact matches, not partials
                const onboardingMessages = [
                    'how can i assist you today?',
                    'welcome to',
                    'i\'m here to help',
                    'what would you like to know?'
                ];
                if (onboardingMessages.some(msg => content === msg)) {
                    return false;
                }
            }
            return true;
        }
    );
    
    // Debug logging for message ordering
    if (messages.length > 0) {
        //     id: m.id,
        //     role: m.role,
        //     createdAt: m.createdAt || m.created_at
        // })));
    }

    return (
        <div className="w-full h-full flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: modernLLMStyles }} />
            <div className="h-full flex flex-col
                          bg-white dark:bg-gray-950">
                {/* Modern Chat Header */}
                <div className="px-4 sm:px-6 py-3 border-b flex items-center justify-between flex-shrink-0
                              bg-white dark:bg-gray-900 border-gray-200/50 dark:border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <FaRobot className="text-white text-xs" />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{chatHeaderTitle}</h3>
                        </div>
                    </div>
                    {/* Voice Settings - Only render on client to avoid hydration mismatch */}
                    {typeof window !== 'undefined' && tts.isSupported && (
                        <div className="flex items-center gap-2">
                            {/* Voice Selector Dropdown */}
                            <div className="relative">
                                <select
                                    value={tts.selectedVoice?.name || ''}
                                    onChange={(e) => {
                                        const voice = tts.voices.find(v => v.name === e.target.value);
                                        if (voice) {
                                            tts.setSelectedVoice(voice);
                                            toast.success(`Voice changed to ${voice.name}`, { duration: 2000 });
                                        }
                                    }}
                                    className="px-2 py-2 pr-8 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer appearance-none max-w-[200px] truncate"
                                    title={`Current voice: ${tts.selectedVoice?.name || 'Default'} - Click to change`}
                                >
                                    {tts.voices.length === 0 ? (
                                        <option value="">Loading voices...</option>
                                    ) : (
                                        tts.voices.map((voice, index) => (
                                            <option key={index} value={voice.name}>
                                                {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <FaChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 w-3 h-3" />
                            </div>
                            {/* Auto-read Toggle */}
                            <button
                                onClick={() => {
                                    setAutoReadEnabled(!autoReadEnabled);
                                    if (autoReadEnabled && tts.isSpeaking) {
                                        tts.stop();
                                        setCurrentSpeakingId(null);
                                    }
                                }}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                    autoReadEnabled
                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                                }`}
                                title={autoReadEnabled ? 'Disable auto-read' : 'Enable auto-read AI responses'}
                            >
                                {autoReadEnabled ? (
                                    <FaVolumeUp className="w-4 h-4" />
                                ) : (
                                    <FaVolumeMute className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat Messages */}
                <div 
                    ref={chatContainerRef} 
                    className="flex-1 overflow-y-auto py-6 scroll-smooth relative custom-scrollbar min-h-0"
                    style={{ 
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(156, 163, 175, 0.4) rgba(0, 0, 0, 0.05)'
                    }}
                >
                    {/* Error message if chat history failed to load */}
                    {status === 'failed' && error && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <FaRobot className="text-white text-lg" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conversation Not Found</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">{typeof error === 'string' ? error : 'The conversation you are looking for does not exist or was deleted.'}</p>
                            {conversations && conversations.length > 0 ? (
                                <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-5 py-2.5 transition-all duration-200 shadow-sm text-sm font-medium"
                                    onClick={() => window.location.replace(`/user/${projectId}/chat?conversationId=${conversations[0].id}`)}
                                >
                                    Go to First Conversation
                                </button>
                            ) : (
                                <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-5 py-2.5 transition-all duration-200 shadow-sm text-sm font-medium"
                                    onClick={() => window.location.replace(`/user/${projectId}/chat?new=1`)}
                                >
                                    Start New Chat
                                </button>
                            )}
                        </div>
                    )}
                    {/* Modern Scroll to bottom button */}
                    {showScrollButton && status !== 'failed' && (
                        <button
                            onClick={scrollToBottom}
                            className="absolute bottom-6 right-6 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-gray-600 shadow-md border border-gray-200/50 transition-all duration-200 hover:scale-105 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-700"
                            title="Scroll to bottom"
                        >
                            <FaChevronDown className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {messages.length === 0 && !isLoading && status !== 'failed' ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <FaRobot className="text-white text-lg" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Start a conversation with {agentName}</p>
                            </div>
                        </div>
                    ) : status !== 'failed' ? (
                        <>
                            {filteredMessages.map((message, idx) => (
                                <div key={`${activeConversationId || 'new'}-${message.id || idx}`} className="flex flex-col">
                                    <MessageBubble 
                                        message={message} 
                                        aiAgentName={agentName} 
                                        onToggleImportance={handleToggleImportance} 
                                        isImportant={isMessageImportant(message.id)}
                                        isMarkingImportant={importanceOperationStatus === 'loading'}
                                        tts={tts}
                                        currentSpeakingId={currentSpeakingId}
                                        onSpeak={handleSpeakMessage}
                                    />
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-4 w-full px-4 sm:px-6 animate-fade-in">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                                        <FaRobot className="text-white text-sm" />
                                    </div>
                                    <div className="max-w-2xl px-5 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                {agentName}
                                            </span>
                                        </div>
                                        
                                        {/* Modern typing indicator */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1.5">
                                                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {responseProgress < 30 ? 'Thinking...' : 
                                                 responseProgress < 60 ? 'Processing...' : 
                                                 responseProgress < 90 ? 'Almost done...' : 
                                                 'Finalizing...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Modern Chat Input */}
                <div className="border-t px-4 sm:px-6 py-4 flex-shrink-0
                              bg-white dark:bg-gray-900 border-gray-200/50
                              dark:border-gray-800/50">
                    <form onSubmit={handleSubmit} className="flex items-end gap-2 w-full px-4 sm:px-6">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                id="userInput"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={`Message ${agentName}...`}
                                className="chat-input w-full rounded-2xl py-3.5 px-4 border outline-none transition resize-none overflow-hidden
                                           bg-gray-50 text-gray-900 border-gray-200 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:shadow-sm
                                           dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder:text-gray-500 dark:focus:border-gray-600 dark:focus:bg-gray-800
                                           min-h-[52px] max-h-32 text-sm"
                                disabled={isLoading}
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />
                            {/* Voice listening indicator */}
                            {isListening && (
                                <div className="absolute top-2 right-2 flex items-center gap-2 px-2.5 py-1 bg-red-500 text-white rounded-full text-xs animate-pulse shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                    <span>Listening...</span>
                                </div>
                            )}
                        </div>
                        {/* Stop Button - Left of microphone button, show when loading */}
                        {isLoading && (
                            <button
                                type="button"
                                onClick={() => {
                                    dispatch(cancelChatRequest());
                                    toast.success('Request cancelled');
                                }}
                                className="rounded-xl p-3 bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-sm"
                                title="Stop generation"
                            >
                                <FaStop className="w-4 h-4" />
                            </button>
                        )}
                        {isVoiceSupported && (
                            <button
                                type="button"
                                onClick={handleVoiceToggle}
                                className={`rounded-xl p-3 transition-all duration-200 ${
                                    isListening
                                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-sm'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
                                }`}
                                disabled={isLoading}
                                title={isListening ? 'Stop recording' : 'Start voice input'}
                            >
                                {isListening ? (
                                    <FaMicrophoneSlash className="w-4 h-4" />
                                ) : (
                                    <FaMicrophone className="w-4 h-4" />
                                )}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleGenerateVisualization}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl p-3 transition-all duration-200 disabled:cursor-not-allowed
                                       disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
                            disabled={isLoading || !inputValue.trim()}
                            title="Generate Visualization"
                        >
                            <FaChartBar className="w-4 h-4" />
                        </button>
                        <button
                            id="sendButton"
                            type="submit"
                            className="send-button bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-3 transition-all duration-200 disabled:cursor-not-allowed
                                       disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 shadow-sm"
                            disabled={isLoading || !inputValue.trim()}
                        >
                            <FaPaperPlane className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center hidden sm:block px-4 sm:px-6">
                        {isVoiceSupported 
                            ? 'Press Enter to send, Shift+Enter for new line'
                            : 'Press Enter to send, Shift+Enter for new line'
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chat...</p>
                </div>
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}