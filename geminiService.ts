
import { GoogleGenAI, Type } from "@google/genai";

export const generateShipmentSummary = async (shipmentData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this shipment data and provide a concise, professional executive summary (max 3 sentences) focusing on risk and progress: ${JSON.stringify(shipmentData)}`,
    config: {
        systemInstruction: "You are a senior logistics risk analyst for TOMOCA coffee exports."
    }
  });
  return response.text;
};

export const generateFinancialReport = async (financialData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Consolidate and analyze this financial telemetry to provide a high-level strategic performance report. Focus on FX exposure risks, payment velocity, and capital efficiency. Data: ${JSON.stringify(financialData)}`,
    config: {
        systemInstruction: "You are a Chief Financial Officer (CFO) AI specialized in global commodity trade and Ethiopian export finance. Your reports are concise, strategic, and use high-confidence professional terminology."
    }
  });
  return response.text;
};

export const extractBankPermitData = async (documentText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract the following fields from this bank permit document text: Permit Number, Applicant, Amount, and Expiry Date. Text: ${documentText}`,
    config: {
        systemInstruction: "You are an automated data extraction assistant for an export bank permit office.",
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                permitNumber: { type: Type.STRING },
                applicant: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                expiryDate: { type: Type.STRING }
            },
            required: ["permitNumber", "applicant", "amount", "expiryDate"]
        }
    }
  });
  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    return null;
  }
};

export const extractFormFields = async (docType: string, documentText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this ${docType} document text and extract all relevant fields such as Invoice Number, Date, Buyer Name, Seller Name, Total Amount, Quantity, etc. Return as a flat JSON object with descriptive keys. Text: ${documentText}`,
    config: {
        systemInstruction: "You are a high-precision document extraction engine for export-import protocols.",
        responseMimeType: "application/json"
    }
  });
  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    return null;
  }
};

export const analyzeRegulatoryRisk = async (destination: string, shipmentDocs: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Evaluate the regulatory risk for a coffee export to ${destination}. Current documents provided: ${shipmentDocs.join(', ')}. Identify missing mandatory documents or potential customs hurdles.`,
    config: {
        systemInstruction: "You are an expert in international trade compliance and Ethiopian export regulations."
    }
  });
  return response.text;
};

export const getAIBuyerRiskAdvisory = async (buyerData: any) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a strategic risk advisory for this buyer: ${JSON.stringify(buyerData)}. Suggest three actionable points for the management team.`,
        config: {
            systemInstruction: "You are a credit risk consultant specialized in the global coffee commodities market."
        }
    });
    return response.text;
};

export const getLiveCoffeeInsights = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Give a brief summary of current global Arabica coffee price trends (simulated for demo purposes based on recent market sentiment). Use search grounding to be realistic.",
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    return response.text;
};

export const getLiveExchangeRates = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Provide the current exchange rate for 1 USD to Ethiopian Birr (ETB), EUR, and GBP.",
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ETB: { type: Type.NUMBER, description: "Exchange rate for 1 USD to ETB" },
                    EUR: { type: Type.NUMBER, description: "Exchange rate for 1 USD to EUR" },
                    GBP: { type: Type.NUMBER, description: "Exchange rate for 1 USD to GBP" }
                },
                required: ["ETB", "EUR", "GBP"]
            }
        }
    });
    try {
        return JSON.parse(response.text.trim());
    } catch (e) {
        return { 'ETB': 125.0, 'EUR': 0.94, 'GBP': 0.79, 'USD': 1.0 };
    }
};
