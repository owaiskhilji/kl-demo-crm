/**
 * lib/meta/graphApiClient.ts
 * Wrapper for fetching data from the Facebook Graph API.
 */

/**
 * Fetches the full lead data from Facebook Graph API using the leadgen_id
 * provided in the webhook payload.
 * 
 * @param leadgenId The ID received in the webhook payload
 * @param pageAccessToken A valid Page Access Token or System User Token
 */
export async function fetchFacebookLead(leadgenId: string, pageAccessToken: string) {
  const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${pageAccessToken}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[Graph API] Error fetching lead:", errorData);
    throw new Error(`Failed to fetch Facebook lead: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Maps dynamic Facebook Lead Ad form fields to our CRM schema.
 * Lead Ad forms vary per agency/campaign, so we use heuristic matching 
 * to extract standard fields (name, phone, email, area, budget) regardless 
 * of what the marketer named the field in the form builder.
 * 
 * @param fieldData The field_data array from the Graph API lead response
 */
export function mapFacebookLeadFields(fieldData: any[]) {
  const mapped: any = {
    name: "Unknown Facebook Lead",
    phone: "No phone provided", // Fallback, required by DB
    email: null,
    area: null,
    budget: null,
  };

  for (const field of fieldData || []) {
    const fieldName = (field.name || "").toLowerCase();
    const value = field.values?.[0] || "";

    if (!value) continue;

    if (fieldName.includes("name") || fieldName === "full_name" || fieldName === "first_name") {
      // If we already have a name and get another (like last_name), append it
      if (mapped.name !== "Unknown Facebook Lead" && !fieldName.includes("full")) {
        mapped.name += ` ${value}`;
      } else {
        mapped.name = value;
      }
    } else if (fieldName.includes("phone") || fieldName === "phone_number") {
      mapped.phone = value;
    } else if (fieldName.includes("email")) {
      mapped.email = value;
    } else if (fieldName.includes("area") || fieldName.includes("location") || fieldName.includes("city")) {
      mapped.area = value;
    } else if (fieldName.includes("budget") || fieldName.includes("price") || fieldName.includes("investment")) {
      // Extract numeric value for the BIGINT budget field
      const numericVal = parseInt(value.replace(/\D/g, ""), 10);
      if (!isNaN(numericVal)) {
        mapped.budget = numericVal;
      }
    }
  }

  return mapped;
}
