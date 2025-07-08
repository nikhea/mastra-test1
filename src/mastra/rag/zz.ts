import fs from "fs/promises";
import { MDocument, rerank } from "@mastra/rag";
import { embed, embedMany } from "ai";
import { QdrantVector } from "@mastra/qdrant";
import { ollama } from "ollama-ai-provider";
import { groq } from "@ai-sdk/groq";

// Environment validation
if (!process.env.QDRANT_URL) {
  throw new Error("QDRANT_URL must be set");
}

// Initialize components
const llm = groq("llama-3.3-70b-versatile");
export const qdrant = new QdrantVector({
  url: process.env.QDRANT_URL!,
  // apiKey: process.env.QDRANT_API_KEY, // Uncomment if using Qdrant Cloud
});

export const indexName = "real_estate_properties";
export const embedModel = ollama.embedding("nomic-embed-text");

// Real Estate Property Interface
interface RealEstateProperty {
  _id: string;
  slug: string;
  description: string;
  state: string;
  area: string;
  street: string;
  listingId: string;
  listingType: "for sale" | "for rent";
  title: string;
  squareMeter?: string;
  propertyType: string;
  subType: string;
  numberOfRooms?: number;
  numberOfBathrooms?: number;
  numberOfToilets?: number;
  amenities: string[];
  price: number;
  totalFee: number;
  contacts: {
    phoneNumber: string;
    whatsapp?: string;
  };
  paymentType: string;
  newlyBuilt?: boolean;
  serviced?: boolean;
  is_published: boolean;
  is_verified: boolean;
  is_promoted: boolean;
  is_deleted: boolean;
  photos: Array<{
    url: string;
    publicId: string;
  }>;
  coverPhoto?: {
    url: string;
    publicId: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface SearchFilters {
  state?: string;
  area?: string;
  listingType?: "for sale" | "for rent";
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  isVerified?: boolean;
  hasAmenities?: string[];
}

class RealEstateRAG {
  private qdrant: QdrantVector;
  private indexName: string;
  private embedModel: any;
  private llm: any;

  constructor() {
    this.qdrant = qdrant;
    this.indexName = indexName;
    this.embedModel = embedModel;
    this.llm = llm;
  }

  // Create searchable text from property data
  private createSearchableText(property: RealEstateProperty): string {
    const parts = [
      property.title,
      property.description,
      `${property.propertyType} ${property.subType}`,
      `Located in ${property.street}, ${property.area}, ${property.state}`,
      `${property.listingType} at ₦${property.price.toLocaleString()}`,
      property.amenities.length > 0
        ? `Amenities: ${property.amenities.join(", ")}`
        : "",
      property.numberOfRooms ? `${property.numberOfRooms} bedrooms` : "",
      property.numberOfBathrooms
        ? `${property.numberOfBathrooms} bathrooms`
        : "",
      property.numberOfToilets ? `${property.numberOfToilets} toilets` : "",
      property.squareMeter ? `${property.squareMeter} square meters` : "",
      property.paymentType ? `Payment: ${property.paymentType}` : "",
      property.newlyBuilt ? "newly built" : "",
      property.serviced ? "serviced" : "",
    ];

    return parts.filter(Boolean).join(". ").toLowerCase();
  }

  // Enhanced metadata for better filtering and autocomplete
  private createEnhancedMetadata(
    property: RealEstateProperty,
    searchableText: string
  ) {
    return {
      // Original property data
      ...property,

      // Enhanced searchable text
      searchableText,

      // Normalized fields for better filtering
      normalizedState: property.state.toLowerCase().trim(),
      normalizedArea: property.area.toLowerCase().trim(),
      normalizedPropertyType: property.propertyType.toLowerCase().trim(),
      normalizedSubType: property.subType.toLowerCase().trim(),
      normalizedPaymentType: property.paymentType.toLowerCase().trim(),

      // Price categorization
      priceRange: this.getPriceRange(property.price),
      pricePerSqm: property.squareMeter
        ? Math.round(property.price / parseInt(property.squareMeter))
        : null,

      // Room categorization
      roomCategory: this.getRoomCategory(property.numberOfRooms),

      // Location hierarchy for autocomplete
      locationHierarchy: [
        property.state,
        `${property.area}, ${property.state}`,
        `${property.street}, ${property.area}, ${property.state}`,
      ].filter(Boolean),

      // Property features
      hasAmenities: property.amenities.length > 0,
      amenitiesCount: property.amenities.length,
      hasPhotos: property.photos.length > 0,
      photosCount: property.photos.length,

      // Status flags
      isAffordable: property.price < 5000000,
      isLuxury: property.price > 50000000,
      isPremium: property.is_verified && property.photos.length > 3,

      // Searchable keywords
      keywords: this.extractKeywords(property),
    };
  }

  private getPriceRange(price: number): string {
    if (price < 1000000) return "under_1m";
    if (price < 5000000) return "1m_to_5m";
    if (price < 10000000) return "5m_to_10m";
    if (price < 50000000) return "10m_to_50m";
    return "above_50m";
  }

  private getRoomCategory(rooms?: number): string {
    if (!rooms) return "unknown";
    if (rooms === 1) return "studio";
    if (rooms <= 2) return "small";
    if (rooms <= 4) return "medium";
    return "large";
  }

  private extractKeywords(property: RealEstateProperty): string[] {
    const keywords = new Set<string>();

    // Property type keywords
    keywords.add(property.propertyType.toLowerCase());
    keywords.add(property.subType.toLowerCase());

    // Location keywords
    keywords.add(property.state.toLowerCase());
    keywords.add(property.area.toLowerCase());

    // Feature keywords
    if (property.newlyBuilt) keywords.add("new");
    if (property.serviced) keywords.add("serviced");
    if (property.is_verified) keywords.add("verified");

    // Price keywords
    if (property.price < 2000000) keywords.add("affordable");
    if (property.price > 20000000) keywords.add("luxury");

    // Room keywords
    if (property.numberOfRooms) {
      keywords.add(`${property.numberOfRooms}bedroom`);
      keywords.add(`${property.numberOfRooms}br`);
    }

    return Array.from(keywords);
  }

  // Initialize the collection
  async initializeCollection(): Promise<void> {
    try {
      // Test embedding to get dimension
      const testEmbedding = await embed({
        value: "test",
        model: this.embedModel,
      });

      await this.qdrant.createIndex({
        indexName: this.indexName,
        dimension: testEmbedding.embedding.length,
      });

      console.log(`Collection '${this.indexName}' initialized successfully`);
    } catch (error) {
      console.error("Error initializing collection:", error);
      throw error;
    }
  }

  // Chunk and embed properties using MDocument
  async embedProperties(properties: RealEstateProperty[]): Promise<void> {
    console.log(`Starting to embed ${properties.length} properties...`);

    try {
      // Create chunks for each property
      const allChunks: any[] = [];
      const allMetadata: any[] = [];

      for (const property of properties) {
        const searchableText = this.createSearchableText(property);
        const enhancedMetadata = this.createEnhancedMetadata(
          property,
          searchableText
        );

        // Use MDocument to chunk the searchable text
        const doc = MDocument.fromText(searchableText);
        const chunks = await doc.chunk({
          maxSize: 500, // Adjust based on your needs
          overlap: 50,
        });

        // Add chunks with property metadata
        chunks.forEach((chunk, index) => {
          allChunks.push(chunk.text);
          allMetadata.push({
            ...enhancedMetadata,
            chunkId: `${property._id}_${index}`,
            chunkText: chunk.text,
            chunkIndex: index,
            totalChunks: chunks.length,
          });
        });
      }

      // Generate embeddings for all chunks
      const { embeddings } = await embedMany({
        model: this.embedModel,
        values: allChunks,
        maxRetries: 3,
      });

      // Upsert to Qdrant
      await this.qdrant.upsert({
        indexName: this.indexName,
        vectors: embeddings,
        metadata: allMetadata,
      });

      console.log(
        `Successfully embedded ${properties.length} properties into ${allChunks.length} chunks`
      );
    } catch (error) {
      console.error("Error embedding properties:", error);
      throw error;
    }
  }

  // Similarity search with reranking
  async searchProperties(
    query: string,
    filters?: SearchFilters,
    topK: number = 10,
    useReranking: boolean = true
  ): Promise<any[]> {
    try {
      // Generate query embedding
      const { embedding } = await embed({
        value: query.toLowerCase(),
        model: this.embedModel,
      });

      // Build filter conditions
      const filterConditions: any = {
        must: [{ key: "is_published", match: { value: true } }],
      };

      if (filters) {
        if (filters.state) {
          filterConditions.must.push({
            key: "normalizedState",
            match: { value: filters.state.toLowerCase() },
          });
        }
        if (filters.area) {
          filterConditions.must.push({
            key: "normalizedArea",
            match: { value: filters.area.toLowerCase() },
          });
        }
        if (filters.listingType) {
          filterConditions.must.push({
            key: "listingType",
            match: { value: filters.listingType },
          });
        }
        if (filters.propertyType) {
          filterConditions.must.push({
            key: "normalizedPropertyType",
            match: { value: filters.propertyType.toLowerCase() },
          });
        }
        if (filters.minPrice !== undefined) {
          filterConditions.must.push({
            key: "price",
            range: { gte: filters.minPrice },
          });
        }
        if (filters.maxPrice !== undefined) {
          filterConditions.must.push({
            key: "price",
            range: { lte: filters.maxPrice },
          });
        }
        if (filters.minRooms !== undefined) {
          filterConditions.must.push({
            key: "numberOfRooms",
            range: { gte: filters.minRooms },
          });
        }
        if (filters.isVerified !== undefined) {
          filterConditions.must.push({
            key: "is_verified",
            match: { value: filters.isVerified },
          });
        }
      }

      // Initial vector search
      const initialResults = await this.qdrant.query({
        indexName: this.indexName,
        queryVector: embedding,
        topK: topK * 2, // Get more results for reranking
        filter: filterConditions,
      });

      if (!useReranking) {
        return initialResults;
      }

      // Rerank results using Mastra's rerank function
      const rerankedResults = await rerank(initialResults, query, this.llm, {
        weights: {
          semantic: 0.5,
          vector: 0.3,
          position: 0.2,
        },
        topK: topK,
      });

      return rerankedResults;
    } catch (error) {
      console.error("Error in search:", error);
      throw error;
    }
  }

  // Autocomplete functionality
  async getAutocompleteSuggestions(
    partialQuery: string,
    type: "location" | "property" | "general" = "general",
    limit: number = 5
  ): Promise<string[]> {
    try {
      const query = partialQuery.toLowerCase().trim();

      if (query.length < 2) return [];

      // Generate embedding for the partial query
      const { embedding } = await embed({
        value: query,
        model: this.embedModel,
      });

      // Search for relevant chunks
      const results = await this.qdrant.query({
        indexName: this.indexName,
        queryVector: embedding,
        topK: 50,
        filter: {
          must: [{ key: "is_published", match: { value: true } }],
        },
      });

      const suggestions = new Set<string>();

      results.forEach((result: any) => {
        const metadata = result.metadata;

        switch (type) {
          case "location":
            // Location-based suggestions
            if (metadata.normalizedState?.includes(query)) {
              suggestions.add(metadata.state);
            }
            if (metadata.normalizedArea?.includes(query)) {
              suggestions.add(`${metadata.area}, ${metadata.state}`);
            }
            metadata.locationHierarchy?.forEach((location: string) => {
              if (location.toLowerCase().includes(query)) {
                suggestions.add(location);
              }
            });
            break;

          case "property":
            // Property type suggestions
            if (metadata.normalizedPropertyType?.includes(query)) {
              suggestions.add(metadata.propertyType);
            }
            if (metadata.normalizedSubType?.includes(query)) {
              suggestions.add(metadata.subType);
            }
            metadata.keywords?.forEach((keyword: string) => {
              if (keyword.includes(query)) {
                suggestions.add(keyword);
              }
            });
            break;

          case "general":
            // General suggestions from titles and descriptions
            if (metadata.title?.toLowerCase().includes(query)) {
              suggestions.add(metadata.title);
            }
            // Add property summary
            suggestions.add(
              `${metadata.propertyType} in ${
                metadata.area
              } - ₦${metadata.price?.toLocaleString()}`
            );
            break;
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error("Error getting autocomplete suggestions:", error);
      return [];
    }
  }

  // Get property recommendations
  async getRecommendations(
    propertyId: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // Find the reference property
      const refResults = await this.qdrant.query({
        indexName: this.indexName,
        queryVector: [], // We'll search by metadata first
        topK: 1,
        filter: {
          must: [{ key: "_id", match: { value: propertyId } }],
        },
      });

      if (refResults.length === 0) {
        throw new Error("Reference property not found");
      }

      const refProperty = refResults[0].metadata;

      // Search for similar properties
      const { embedding } = await embed({
        value: refProperty?.searchableText,
        model: this.embedModel,
      });

      const recommendations = await this.qdrant.query({
        indexName: this.indexName,
        queryVector: embedding,
        topK: limit + 5, // Get extra to filter out the reference
        filter: {
          must: [
            { key: "is_published", match: { value: true } },
            { key: "_id", match: { value: propertyId, should: false } },
          ],
        },
      });

      // Group by property ID to avoid duplicate chunks
      const uniqueProperties = new Map();
      recommendations.forEach((result: any) => {
        const propId = result.metadata._id;
        if (!uniqueProperties.has(propId)) {
          uniqueProperties.set(propId, result);
        }
      });

      return Array.from(uniqueProperties.values()).slice(0, limit);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw error;
    }
  }

  // Get search analytics
  async getAnalytics(): Promise<any> {
    try {
      const allResults = await this.qdrant.query({
        indexName: this.indexName,
        queryVector: [], // Empty vector to get all
        topK: 1000,
        filter: {
          must: [{ key: "chunkIndex", match: { value: 0 } }], // Only first chunk of each property
        },
      });

      const properties = allResults.map((r: any) => r.metadata);

      return {
        totalProperties: properties.length,
        byState: this.groupBy(properties, "state"),
        byPropertyType: this.groupBy(properties, "propertyType"),
        byListingType: this.groupBy(properties, "listingType"),
        byPriceRange: this.groupBy(properties, "priceRange"),
        avgPrice:
          properties.reduce((sum, p) => sum + (p.price || 0), 0) /
          properties.length,
        verifiedCount: properties.filter((p) => p.is_verified).length,
        withPhotosCount: properties.filter((p) => p.hasPhotos).length,
      };
    } catch (error) {
      console.error("Error getting analytics:", error);
      throw error;
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const groupKey = item[key] || "unknown";
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      return acc;
    }, {});
  }
}

// Main function to set up RAG with your real estate data
async function setupRealEstateRAG(properties: RealEstateProperty[]) {
  const rag = new RealEstateRAG();

  try {
    console.log("Initializing collection...");
    await rag.initializeCollection();

    console.log("Embedding properties...");
    await rag.embedProperties(properties);

    console.log("RAG system ready!");
    return rag;
  } catch (error) {
    console.error("Error setting up RAG:", error);
    throw error;
  }
}

// Example usage
async function example() {
  // Your sample data
  const sampleProperties: RealEstateProperty[] = [
    {
      _id: "67d80cfafab2aceee1a4f9b9",
      slug: "p2794-hurry-now!-affordable-dry-plots.-best-deal-in-'the-new-lagos'.-dont-miss-out.-closing-soon-for-sale-lagos-ibeju-lekki",
      description:
        "BE A LAND OWNER! Sweet Country Ltd. is still offering several plots of land at its Hosanna Park Estate for sale at an unbelievable price in a fast-developing area tagged 'The New Lagos'.\n\nPRICE: Hosanna Park & Gardens: N1.3 m  per plot\n\nLOCATION: Eleranigbe, Epe, Lagos State\n\nFor more info and free site inspection, call: 08023992269",
      state: "Lagos",
      area: "Ibeju-Lekki",
      street: "Eleranigbe in Ibeju-Lekki",
      listingId: "p2794",
      listingType: "for sale",
      title:
        "HURRY NOW! Affordable dry plots. Best deal in 'The New Lagos'. Dont miss out. Closing soon",
      squareMeter: "648",
      propertyType: "Land",
      subType: "Mixed-use Land",
      amenities: [],
      photos: [],
      paymentType: "outright payment",
      price: 1300000,
      totalFee: 1300000,
      contacts: {
        phoneNumber: "08023992269",
      },
      newlyBuilt: false,
      serviced: false,
      is_published: true,
      is_verified: false,
      is_promoted: false,
      is_deleted: false,
    },
    // Add more properties here
  ];

  try {
    const rag = await setupRealEstateRAG(sampleProperties);

    // Test similarity search
    console.log("\n=== Testing Similarity Search ===");
    const searchResults = await rag.searchProperties(
      "affordable land in Lagos",
      { state: "Lagos", listingType: "for sale" }
    );
    console.log("Search results:", searchResults.length);

    // Test autocomplete
    console.log("\n=== Testing Autocomplete ===");
    const locationSuggestions = await rag.getAutocompleteSuggestions(
      "lag",
      "location"
    );
    console.log("Location suggestions:", locationSuggestions);

    const propertySuggestions = await rag.getAutocompleteSuggestions(
      "land",
      "property"
    );
    console.log("Property suggestions:", propertySuggestions);

    // Test analytics
    console.log("\n=== Analytics ===");
    const analytics = await rag.getAnalytics();
    console.log("Analytics:", analytics);
  } catch (error) {
    console.error("Example error:", error);
  }
}

export {
  RealEstateRAG,
  setupRealEstateRAG,
  type RealEstateProperty,
  type SearchFilters,
};

// Uncomment to run the example
// example();
