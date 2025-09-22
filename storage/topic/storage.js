import * as db from "./db.js";

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  try {
    // Handle different date formats from SQLite
    let date;
    if (typeof dateString === "string") {
      // SQLite returns dates as strings, try to parse them
      date = new Date(dateString);
      // If parsing failed, try alternative format
      if (isNaN(date.getTime())) {
        // Try parsing as ISO string or other formats
        date = new Date(dateString.replace(" ", "T"));
      }
    } else {
      date = new Date(dateString);
    }

    // If still invalid, use current date
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.warn("Date formatting error:", error, "for date:", dateString);
    // Fallback to current date
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

/**
 * Generate default title with current date/time
 */
const generateDefaultTitle = () => {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  try {
    new URL(url);
    return true;
  } catch {
    // Try with https:// prefix if missing
    try {
      new URL(`https://${url}`);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Normalize URL by adding https:// if missing
 */
const normalizeUrl = (url) => {
  if (!url) return "";

  try {
    new URL(url);
    return url;
  } catch {
    return `https://${url}`;
  }
};

// CARD STORAGE FUNCTIONS

/**
 * Create a new card with validation
 */
export const createCard = async ({ title, description }) => {
  try {
    // Use default title if not provided
    const cardTitle = title?.trim() || generateDefaultTitle();
    const cardDescription = description?.trim() || "";

    const cardId = await db.insertCard(cardTitle, cardDescription);

    // Return the created card
    const card = await db.getCardById(cardId);
    return {
      ...card,
      formattedDate: formatDate(card.created_at),
    };
  } catch (error) {
    console.error("Failed to create card:", error);
    throw new Error("Failed to create card. Please try again.");
  }
};

/**
 * Get all cards with formatted data
 */
export const getAllCards = async () => {
  try {
    console.log("Getting all cards from database...");
    const cards = await db.getAllCards();
    console.log("Raw cards from database:", cards);

    // Always ensure we return an array, even if database returns null/undefined
    if (!cards) {
      console.log("No cards returned from database, returning empty array");
      return [];
    }

    if (!Array.isArray(cards)) {
      console.warn("Cards is not an array:", typeof cards, cards);
      return [];
    }

    // If empty array, return early
    if (cards.length === 0) {
      console.log("Database returned empty array");
      return [];
    }

    const formattedCards = [];

    for (let i = 0; i < cards.length; i++) {
      try {
        const card = cards[i];
        console.log(`Processing card ${i}:`, card);

        // Validate card object
        if (!card || typeof card !== "object") {
          console.warn(`Card ${i} is not a valid object:`, card);
          continue;
        }

        const formattedCard = {
          id: card.id,
          title: card.title || null,
          description: card.description || null,
          created_at: card.created_at,
          updated_at: card.updated_at,
          formattedDate: formatDate(card.created_at),
          displayTitle: card.title || generateDefaultTitle(),
          is_completed: !!card.is_completed,
          total_topics: card.total_topics || 0,
          completed_topics: card.completed_topics || 0,
          progress:
            card.total_topics > 0
              ? (card.completed_topics / card.total_topics) * 100
              : 0,
        };

        console.log(`Formatted card ${i}:`, formattedCard);
        formattedCards.push(formattedCard);
      } catch (cardError) {
        console.error(`Error processing card ${i}:`, cardError);
        console.error("Card data:", cards[i]);

        // Try to create a minimal safe fallback
        try {
          const safeCard = {
            id: cards[i]?.id || `temp-${i}`,
            title: null,
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            formattedDate: generateDefaultTitle(),
            displayTitle: generateDefaultTitle(),
          };
          formattedCards.push(safeCard);
        } catch (fallbackError) {
          console.error(
            `Failed to create fallback for card ${i}:`,
            fallbackError
          );
          // Skip this card entirely if we can't even create a fallback
        }
      }
    }

    console.log("All formatted cards:", formattedCards);
    return formattedCards;
  } catch (error) {
    console.error("Failed to get cards:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Instead of throwing, return empty array as last resort
    console.warn("Returning empty array due to error in getAllCards");
    return [];
  }
};

/**
 * Update a card with validation
 */
export const updateCard = async (id, { title, description }) => {
  try {
    if (!id) {
      throw new Error("Card ID is required");
    }

    // Use default title if not provided
    const cardTitle = title?.trim() || generateDefaultTitle();
    const cardDescription = description?.trim() || "";

    await db.updateCard(id, cardTitle, cardDescription);

    // Return the updated card
    const card = await db.getCardById(id);
    return {
      ...card,
      formattedDate: formatDate(card.updated_at),
      displayTitle: card.title || generateDefaultTitle(),
    };
  } catch (error) {
    console.error("Failed to update card:", error);
    throw new Error("Failed to update card. Please try again.");
  }
};

/**
 * Delete a card
 */
export const deleteCard = async (id) => {
  try {
    if (!id) {
      throw new Error("Card ID is required");
    }

    await db.deleteCard(id);
  } catch (error) {
    console.error("Failed to delete card:", error);
    throw new Error("Failed to delete card. Please try again.");
  }
};

/**
 * Get card by ID with formatted data
 */
export const getCard = async (id) => {
  try {
    if (!id) {
      throw new Error("Card ID is required");
    }

    const card = await db.getCardById(id);
    if (!card) {
      throw new Error("Card not found");
    }

    return {
      ...card,
      formattedDate: formatDate(card.created_at),
      displayTitle: card.title || generateDefaultTitle(),
    };
  } catch (error) {
    console.error("Failed to get card:", error);
    throw new Error("Failed to load card. Please try again.");
  }
};

// TOPIC STORAGE FUNCTIONS

/**
 * Create a new topic with validation
 */
export const createTopic = async ({ cardId, name, description }) => {
  try {
    if (!cardId) {
      throw new Error("Card ID is required");
    }

    if (!name?.trim()) {
      throw new Error("Topic name is required");
    }

    const topicName = name.trim();
    const topicDescription = description?.trim() || "";

    const topicId = await db.insertTopic(cardId, topicName, topicDescription);

    // Update card progress after adding topic
    await db.updateCardProgress(cardId);

    // Return the created topic with links
    const topic = await db.getTopicById(topicId);
    const links = await db.getLinksByTopicId(topicId);

    return {
      ...topic,
      links: links.map((link) => ({
        ...link,
        normalizedUrl: normalizeUrl(link.url),
      })),
      formattedDate: formatDate(topic.created_at),
      is_completed: !!topic.is_completed,
    };
  } catch (error) {
    console.error("Failed to create topic:", error);
    if (error.message.includes("required")) {
      throw error;
    }
    throw new Error("Failed to create topic. Please try again.");
  }
};

/**
 * Get all topics for a card with links
 */
export const getTopicsByCard = async (cardId) => {
  try {
    if (!cardId) {
      throw new Error("Card ID is required");
    }

    const topics = await db.getTopicsByCardId(cardId);

    // Get links for each topic
    const topicsWithLinks = await Promise.all(
      topics.map(async (topic) => {
        const links = await db.getLinksByTopicId(topic.id);
        return {
          ...topic,
          links: links.map((link) => ({
            ...link,
            normalizedUrl: normalizeUrl(link.url),
          })),
          formattedDate: formatDate(topic.created_at),
          is_completed: !!topic.is_completed,
        };
      })
    );

    return topicsWithLinks;
  } catch (error) {
    console.error("Failed to get topics:", error);
    throw new Error("Failed to load topics. Please try again.");
  }
};

/**
 * Update a topic with validation
 */
export const updateTopic = async (id, { name, description }) => {
  try {
    if (!id) {
      throw new Error("Topic ID is required");
    }

    if (!name?.trim()) {
      throw new Error("Topic name is required");
    }

    const topicName = name.trim();
    const topicDescription = description?.trim() || "";

    await db.updateTopic(id, topicName, topicDescription);

    // Return the updated topic with links
    const topic = await db.getTopicById(id);
    const links = await db.getLinksByTopicId(id);

    return {
      ...topic,
      links: links.map((link) => ({
        ...link,
        normalizedUrl: normalizeUrl(link.url),
      })),
      formattedDate: formatDate(topic.updated_at),
    };
  } catch (error) {
    console.error("Failed to update topic:", error);
    if (error.message.includes("required")) {
      throw error;
    }
    throw new Error("Failed to update topic. Please try again.");
  }
};

/**
 * Delete a topic and all its links
 */
export const deleteTopic = async (id) => {
  try {
    if (!id) {
      throw new Error("Topic ID is required");
    }

    // Get the card_id before deleting the topic
    const topic = await db.getTopicById(id);
    if (!topic) {
      throw new Error("Topic not found");
    }

    await db.deleteTopic(id);

    // Update card progress after deleting topic
    await db.updateCardProgress(topic.card_id);
  } catch (error) {
    console.error("Failed to delete topic:", error);
    throw new Error("Failed to delete topic. Please try again.");
  }
};

// LINK STORAGE FUNCTIONS

/**
 * Add a new link to a topic with validation
 */
export const addLink = async ({ topicId, url, title }) => {
  try {
    if (!topicId) {
      throw new Error("Topic ID is required");
    }

    if (!url?.trim()) {
      throw new Error("Link URL is required");
    }

    const linkUrl = url.trim();

    if (!isValidUrl(linkUrl)) {
      throw new Error("Please enter a valid URL");
    }

    const normalizedUrl = normalizeUrl(linkUrl);
    const linkTitle = title?.trim() || "";

    const linkId = await db.insertLink(topicId, normalizedUrl, linkTitle);

    // Return the created link
    const link = await db.getLinksByTopicId(topicId);
    const newLink = link.find((l) => l.id === linkId);

    return {
      ...newLink,
      normalizedUrl: normalizeUrl(newLink.url),
    };
  } catch (error) {
    console.error("Failed to add link:", error);
    if (
      error.message.includes("required") ||
      error.message.includes("valid URL")
    ) {
      throw error;
    }
    throw new Error("Failed to add link. Please try again.");
  }
};

/**
 * Update a link with validation
 */
export const updateLink = async (id, { url, title }) => {
  try {
    if (!id) {
      throw new Error("Link ID is required");
    }

    if (!url?.trim()) {
      throw new Error("Link URL is required");
    }

    const linkUrl = url.trim();

    if (!isValidUrl(linkUrl)) {
      throw new Error("Please enter a valid URL");
    }

    const normalizedUrl = normalizeUrl(linkUrl);
    const linkTitle = title?.trim() || "";

    await db.updateLink(id, normalizedUrl, linkTitle);
  } catch (error) {
    console.error("Failed to update link:", error);
    if (
      error.message.includes("required") ||
      error.message.includes("valid URL")
    ) {
      throw error;
    }
    throw new Error("Failed to update link. Please try again.");
  }
};

/**
 * Delete a link
 */
export const deleteLink = async (id) => {
  try {
    if (!id) {
      throw new Error("Link ID is required");
    }

    await db.deleteLink(id);
  } catch (error) {
    console.error("Failed to delete link:", error);
    throw new Error("Failed to delete link. Please try again.");
  }
};

/**
 * Initialize storage (calls database initialization)
 */
// export const initStorage = async () => {
//   try {
//     await db.initDatabase();
//     // Recalculate progress for existing cards to ensure consistency
//     await db.recalculateAllCardProgress();
//   } catch (error) {
//     console.error('Failed to initialize storage:', error);
//     throw new Error('Failed to initialize storage. Please restart the app.');
//   }
// };

// COMPLETION FUNCTIONS

/**
 * Toggle topic completion status
 */
export const toggleTopicCompletion = async (topicId) => {
  try {
    if (!topicId) {
      throw new Error("Topic ID is required");
    }

    const isCompleted = await db.toggleTopicCompletion(topicId);
    return { isCompleted };
  } catch (error) {
    console.error("Failed to toggle topic completion:", error);
    throw new Error("Failed to update topic completion. Please try again.");
  }
};

/**
 * Get card with progress information
 */
export const getCardWithProgress = async (cardId) => {
  try {
    if (!cardId) {
      throw new Error("Card ID is required");
    }

    const card = await getCard(cardId);
    const progress = await db.getCardProgress(cardId);

    return {
      ...card,
      ...progress,
    };
  } catch (error) {
    console.error("Failed to get card with progress:", error);
    throw new Error("Failed to load card progress. Please try again.");
  }
};

/**
 * Update card progress manually (useful when topics change)
 */
export const updateCardProgress = async (cardId) => {
  try {
    if (!cardId) {
      throw new Error("Card ID is required");
    }

    return await db.updateCardProgress(cardId);
  } catch (error) {
    console.error("Failed to update card progress:", error);
    throw new Error("Failed to update card progress. Please try again.");
  }
};

/**
 * Delete a completed card (used after celebration)
 */
export const deleteCompletedCard = async (cardId) => {
  try {
    if (!cardId) {
      throw new Error("Card ID is required");
    }

    await deleteCard(cardId);
    console.log(`Completed card ${cardId} deleted`);
  } catch (error) {
    console.error("Failed to delete completed card:", error);
    throw new Error("Failed to delete completed card. Please try again.");
  }
};
