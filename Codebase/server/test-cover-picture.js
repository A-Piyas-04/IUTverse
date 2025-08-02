// Test script to verify cover picture functionality
// This can be run manually to test the cover picture endpoints

const API_BASE_URL = "http://localhost:3000/api";

// Example usage of cover picture endpoints:

// 1. Upload cover picture (requires authentication token)
async function uploadCoverPicture(file, authToken) {
  const formData = new FormData();
  formData.append("coverPicture", file);

  try {
    const response = await fetch(`${API_BASE_URL}/profile/upload-cover`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    console.log("Upload response:", data);
    return data;
  } catch (error) {
    console.error("Upload error:", error);
  }
}

// 2. Get cover picture URL (public endpoint)
function getCoverPictureUrl(userId) {
  return `${API_BASE_URL}/profile/cover/${userId}`;
}

// 3. Delete cover picture (requires authentication token)
async function deleteCoverPicture(authToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/cover`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Delete response:", data);
    return data;
  } catch (error) {
    console.error("Delete error:", error);
  }
}

// Test endpoints
console.log("Cover Picture API Test Functions:");
console.log("- uploadCoverPicture(file, authToken)");
console.log("- getCoverPictureUrl(userId)");
console.log("- deleteCoverPicture(authToken)");

// Example: console.log(getCoverPictureUrl(1)); // Returns: "http://localhost:3000/api/profile/cover/1"
