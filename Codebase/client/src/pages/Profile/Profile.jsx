import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ApiService from "../../services/api.js";
import { postService } from "../../services/postService.js";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Posts");
  const [profile, setProfile] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPictureUrl, setCoverPictureUrl] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [modalImageType, setModalImageType] = useState(null); // 'profile' or 'cover'
  const fileInputRef = React.useRef(null);
  const coverInputRef = React.useRef(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [studentIdError, setStudentIdError] = useState("");
  const [studentIdAvailable, setStudentIdAvailable] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Check if this is the current user's profile or someone else's
  const isOwnProfile = !userId || userId === user?.id?.toString();

  const [introForm, setIntroForm] = useState({
    name: "",
    studentId: "",
    bio: "",
    schoolName: "",
    collegeName: "",
    currentProgram: "",
    currentDepartment: "",
    currentYear: "",
    currentSemester: "",
    hometown: "",
    currentResidence: "",
    currentHall: "",
    currentRoom: "",
    currentBed: "",
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const targetUserId = userId || user.id;

        // Fetch profile data
        const profileRes = await ApiService.getProfileByUserId(targetUserId);
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);

          // Set profile picture URL if available
          if (profileRes.data.profilePicture) {
            setProfilePictureUrl(ApiService.getProfilePictureUrl(targetUserId));
          } else {
            setProfilePictureUrl(null);
          }

          // Set cover picture URL if available
          if (profileRes.data.coverPicture) {
            setCoverPictureUrl(ApiService.getCoverPictureUrl(targetUserId));
          } else {
            setCoverPictureUrl(null);
          }
        } else {
          setProfile(null);
          setProfilePictureUrl(null);
          setCoverPictureUrl(null);
        }

        // Fetch user posts
        await fetchUserPosts();

        // If viewing someone else's profile, we need to get their user info
        if (!isOwnProfile) {
          try {
            console.log("Fetching user data for ID:", targetUserId);
            const userRes = await ApiService.getUserById(targetUserId);
            console.log("User API response:", userRes);

            if (userRes.success && userRes.data) {
              console.log("Setting profileUser with data:", userRes.data);
              const userData = userRes.data.data || userRes.data; // Handle nested data structure
              setProfileUser({
                id: targetUserId,
                name: userData.name || "Unknown User",
                email: userData.email,
                department: userData.department,
                batch: userData.batch,
                studentId: userData.studentId,
              });
            } else {
              console.log("API call failed, setting fallback");
              setProfileUser({
                id: targetUserId,
                name: "Unknown User",
              });
            }
          } catch (userError) {
            console.error("Error fetching user:", userError);
            setProfileUser({
              id: targetUserId,
              name: "Unknown User",
            });
          }
        } else {
          setProfileUser(user);
        }
      } catch (error) {
        setProfile(null);
        setProfileUser(null);
      }
      setLoading(false);
    };

    fetchProfile();

    // Initialize form with user name if available and it's own profile
    if (isOwnProfile && user.name) {
      setIntroForm((prev) => ({
        ...prev,
        name: user.name,
        studentId: user.studentId || "",
      }));
    }
  }, [user, userId, isOwnProfile]); // fetchUserPosts is defined inside the component

  const handleIntroChange = (e) => {
    const { name, value } = e.target;

    // If program type changes, reset department
    if (name === "currentProgram") {
      setIntroForm({
        ...introForm,
        [name]: value,
        currentDepartment: "", // Reset department when program changes
      });
    }
    // If bio (department category) changes, reset currentDepartment
    else if (name === "bio") {
      setIntroForm({
        ...introForm,
        [name]: value,
        currentDepartment: "", // Reset currentDepartment when bio changes
      });
    }
    // Handle student ID changes with validation
    else if (name === "studentId") {
      setIntroForm({ ...introForm, [name]: value });

      // Validate student ID
      const error = validateStudentId(value);
      setStudentIdError(error);

      // Check availability if valid
      if (!error) {
        debounceAvailabilityCheck(value);
      } else {
        setStudentIdAvailable(null);
      }
    } else {
      setIntroForm({ ...introForm, [name]: value });
    }
  };

  // Bio/Department category options
  const departmentCategories = [
    "Computer Science and Engineering",
    "Mechanical and Productional Engineering",
    "Electrical and Electronical Engineering",
    "Business and Technology Management",
    "Civil and Environmental Engineering",
  ];

  // Function to get available department options based on bio selection
  const getAvailableDepartments = () => {
    const bio = introForm.bio;

    if (bio === "Computer Science and Engineering") {
      return ["Computer Science and Engineering", "Software Engineering"];
    } else if (bio === "Mechanical and Productional Engineering") {
      return [
        "Mechanical and Productional Engineering",
        "Industrial and Productional Engineering",
      ];
    } else {
      // For other bio values, currentDepartment should be the same as bio
      return [bio];
    }
  };

  // Function to check if department selection should be enabled
  const isDepartmentSelectable = () => {
    const bio = introForm.bio;
    return (
      bio === "Computer Science and Engineering" ||
      bio === "Mechanical and Productional Engineering"
    );
  };

  // Validate student ID
  const validateStudentId = (studentId) => {
    if (!studentId || studentId.trim().length === 0) {
      return "";
    }

    const trimmed = studentId.trim();

    if (trimmed.length < 3 || trimmed.length > 20) {
      return "Student ID must be between 3 and 20 characters long";
    }

    if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
      return "Student ID can only contain letters, numbers, and hyphens";
    }

    return "";
  };

  // Check student ID availability with debouncing
  const checkStudentIdAvailability = async (studentId) => {
    if (!studentId || studentId.trim().length === 0) {
      setStudentIdAvailable(null);
      return;
    }

    const validationError = validateStudentId(studentId);
    if (validationError) {
      setStudentIdAvailable(null);
      return;
    }

    // Don't check if it's the same as current user's student ID
    if (studentId.trim() === user?.studentId) {
      setStudentIdAvailable(null);
      return;
    }

    setCheckingAvailability(true);
    try {
      const result = await ApiService.checkStudentIdAvailability(
        studentId.trim()
      );
      setStudentIdAvailable(result.available);
    } catch (error) {
      console.error("Error checking student ID availability:", error);
      setStudentIdAvailable(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Debounced availability check
  const debounceAvailabilityCheck = React.useCallback(
    (() => {
      let timeout;
      return (studentId) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          checkStudentIdAvailability(studentId);
        }, 500);
      };
    })(),
    [user?.studentId]
  );

  // Function to format the final program value for backend
  const getFormattedProgram = () => {
    if (!introForm.currentProgram || !introForm.currentDepartment) return "";
    const prefix = introForm.currentProgram === "Bachelor" ? "BSc" : "MSc";
    return `${prefix} in ${introForm.currentDepartment}`;
  };

  const handleEditProfile = () => {
    // Parse existing program data if it exists
    let programType = "";
    let department = "";

    if (profile?.currentProgram) {
      if (profile.currentProgram.startsWith("BSc")) {
        programType = "Bachelor";
        department = profile.currentProgram.replace("BSc in ", "");
      } else if (profile.currentProgram.startsWith("MSc")) {
        programType = "Master";
        department = profile.currentProgram.replace("MSc in ", "");
      }
    }

    // Populate form with existing data
    setIntroForm({
      name: user?.name || "",
      studentId: user?.studentId || "",
      bio: profile?.bio || "",
      schoolName: profile?.schoolName || "",
      collegeName: profile?.collegeName || "",
      currentProgram: programType,
      currentDepartment: department,
      currentYear: profile?.currentYear || "",
      currentSemester: profile?.currentSemester || "",
      hometown: profile?.hometown || "",
      currentResidence: profile?.currentResidence || "",
      currentHall: profile?.currentHall || "",
      currentRoom: profile?.currentRoom || "",
      currentBed: profile?.currentBed || "",
    });
    setShowEditForm(true);
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Extract name and studentId from form data and format program
      const {
        name,
        studentId,
        currentProgram,
        currentDepartment,
        bio,
        ...otherData
      } = introForm;

      // Determine the final department value
      let finalDepartment = currentDepartment;

      // If the bio category doesn't allow manual selection, use bio as department
      if (!isDepartmentSelectable() && bio) {
        finalDepartment = bio;
      }

      // Format the program field for backend
      const formattedProgram =
        currentProgram && finalDepartment
          ? `${
              currentProgram === "Bachelor" ? "BSc" : "MSc"
            } in ${finalDepartment}`
          : "";

      const profileData = {
        ...otherData,
        bio,
        currentProgram: formattedProgram,
      };

      // Update user name if provided and different from current
      if (name && name.trim() && name.trim() !== user?.name) {
        const nameUpdateResult = await ApiService.updateUserName(name.trim());
        if (!nameUpdateResult.success) {
          alert(`Failed to update name: ${nameUpdateResult.error}`);
          setFormLoading(false);
          return;
        }
        // Update user context with new name
        updateUser({ name: name.trim() });
      }

      // Update student ID if provided and different from current
      if (studentId !== undefined && studentId.trim() !== user?.studentId) {
        if (studentId.trim() === "") {
          // Delete student ID if empty
          const studentIdResult = await ApiService.deleteStudentId();
          if (!studentIdResult.success) {
            alert(
              `Failed to remove student ID: ${
                studentIdResult.message || "Unknown error"
              }`
            );
            setFormLoading(false);
            return;
          }
          // Update user context
          updateUser({ studentId: null });
        } else {
          // Update student ID
          const studentIdResult = await ApiService.updateStudentId(
            studentId.trim()
          );
          if (!studentIdResult.success) {
            alert(
              `Failed to update student ID: ${
                studentIdResult.message || "Unknown error"
              }`
            );
            setFormLoading(false);
            return;
          }
          // Update user context
          updateUser({ studentId: studentId.trim() });
        }
      }

      // Update profile with remaining data
      const res = await ApiService.updateProfile(profileData);
      if (res.success) {
        setShowEditForm(false);
        setProfile(res.data);

        // Refresh the profile data to show updated information
        const updatedProfile = await ApiService.getProfileByUserId(user.id);
        if (updatedProfile.success) {
          setProfile(updatedProfile.data);
        }

        // Show success message
        let message = "Profile updated successfully!";
        const nameChanged = name && name.trim() && name.trim() !== user?.name;
        const studentIdChanged =
          studentId !== undefined && studentId.trim() !== user?.studentId;

        if (nameChanged && studentIdChanged) {
          message = "Name, Student ID, and profile updated successfully!";
        } else if (nameChanged) {
          message = "Name and profile updated successfully!";
        } else if (studentIdChanged) {
          message = "Student ID and profile updated successfully!";
        }

        // Create a temporary success message element
        const successDiv = document.createElement("div");
        successDiv.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300";
        successDiv.textContent = message;
        document.body.appendChild(successDiv);

        // Remove the message after 3 seconds
        setTimeout(() => {
          successDiv.style.transform = "translateX(100%)";
          setTimeout(() => document.body.removeChild(successDiv), 300);
        }, 3000);
      } else {
        alert(`Failed to update profile: ${res.error}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating profile. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPicture(true);

      // Check if file size is too large (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should be less than 2MB");
        setUploadingPicture(false);
        return;
      }

      // Upload the profile picture
      const result = await ApiService.uploadProfilePicture(file);

      if (result.success) {
        // Update profile state with the new profilePicture
        if (profile) {
          const updatedProfile = {
            ...profile,
            profilePicture: result.data.profilePicture,
          };
          setProfile(updatedProfile);
        }

        // Update the profile picture URL with a timestamp to bust cache
        const newUrl = `${ApiService.getProfilePictureUrl(
          user.id
        )}?t=${Date.now()}`;
        setProfilePictureUrl(newUrl);

        // Show success message
        const successDiv = document.createElement("div");
        successDiv.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300";
        successDiv.textContent = "Profile picture updated successfully!";
        document.body.appendChild(successDiv);

        // Remove the message after 3 seconds
        setTimeout(() => {
          successDiv.style.transform = "translateX(100%)";
          setTimeout(() => document.body.removeChild(successDiv), 300);
        }, 3000);
      } else {
        alert(`Failed to upload profile picture: ${result.error}`);
      }
    } catch (error) {
      alert(
        "An error occurred while uploading profile picture. Please try again."
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  // Handle profile picture deletion
  const handleDeleteProfilePicture = async () => {
    if (!confirm("Are you sure you want to delete your profile picture?")) {
      return;
    }

    try {
      setUploadingPicture(true);

      const result = await ApiService.deleteProfilePicture();

      if (result.success) {
        // Update profile state
        if (profile) {
          setProfile({
            ...profile,
            profilePicture: null,
          });
        }

        // Reset the profile picture URL
        setProfilePictureUrl(null);

        // Show success message
        const successDiv = document.createElement("div");
        successDiv.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300";
        successDiv.textContent = "Profile picture deleted successfully!";
        document.body.appendChild(successDiv);

        // Remove the message after 3 seconds
        setTimeout(() => {
          successDiv.style.transform = "translateX(100%)";
          setTimeout(() => document.body.removeChild(successDiv), 300);
        }, 3000);
      } else {
        alert(`Failed to delete profile picture: ${result.error}`);
      }
    } catch (error) {
      alert(
        "An error occurred while deleting profile picture. Please try again."
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  // Handle cover picture upload
  const handleCoverPictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB limit for cover pictures)
    if (file.size > 5 * 1024 * 1024) {
      alert("Cover picture must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    try {
      setUploadingCover(true);

      const result = await ApiService.uploadCoverPicture(file);

      if (result.success) {
        // Update profile state with the new coverPicture
        if (profile) {
          setProfile({
            ...profile,
            coverPicture: result.data.coverPicture,
          });
        }

        // Generate new URL with timestamp to force refresh
        const newUrl = `${ApiService.getCoverPictureUrl(
          user.id
        )}?t=${Date.now()}`;
        setCoverPictureUrl(newUrl);

        // Show success message
        const successDiv = document.createElement("div");
        successDiv.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300";
        successDiv.textContent = "Cover picture updated successfully!";
        document.body.appendChild(successDiv);

        // Remove the message after 3 seconds
        setTimeout(() => {
          successDiv.style.transform = "translateX(100%)";
          setTimeout(() => document.body.removeChild(successDiv), 300);
        }, 3000);
      } else {
        alert(`Failed to upload cover picture: ${result.error}`);
      }
    } catch (error) {
      alert(
        "An error occurred while uploading cover picture. Please try again."
      );
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle cover picture deletion
  const handleDeleteCoverPicture = async () => {
    if (!confirm("Are you sure you want to delete your cover picture?")) {
      return;
    }

    try {
      setUploadingCover(true);

      const result = await ApiService.deleteCoverPicture();

      if (result.success) {
        // Update profile state
        if (profile) {
          setProfile({
            ...profile,
            coverPicture: null,
          });
        }

        // Reset the cover picture URL
        setCoverPictureUrl(null);

        // Show success message
        const successDiv = document.createElement("div");
        successDiv.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300";
        successDiv.textContent = "Cover picture deleted successfully!";
        document.body.appendChild(successDiv);

        // Remove the message after 3 seconds
        setTimeout(() => {
          successDiv.style.transform = "translateX(100%)";
          setTimeout(() => document.body.removeChild(successDiv), 300);
        }, 3000);
      } else {
        alert(`Failed to delete cover picture: ${result.error}`);
      }
    } catch (error) {
      alert(
        "An error occurred while deleting cover picture. Please try again."
      );
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle opening image modal
  const openImageModal = (imageUrl, imageType) => {
    if (imageUrl) {
      setModalImageUrl(imageUrl);
      setModalImageType(imageType);
      setShowImageModal(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
  };

  // Handle closing image modal
  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImageUrl(null);
    setModalImageType(null);
    // Restore body scroll
    document.body.style.overflow = "unset";
  };

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && showImageModal) {
        closeImageModal();
      }
    };

    if (showImageModal) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [showImageModal]);

  const handleIntroSubmit = async (e) => {
    e.preventDefault();

    try {
      // Extract name and studentId from form data and format program
      const {
        name,
        studentId,
        currentProgram,
        currentDepartment,
        bio,
        ...otherData
      } = introForm;

      // Determine the final department value
      let finalDepartment = currentDepartment;

      // If the bio category doesn't allow manual selection, use bio as department
      if (!isDepartmentSelectable() && bio) {
        finalDepartment = bio;
      }

      // Format the program field for backend
      const formattedProgram =
        currentProgram && finalDepartment
          ? `${
              currentProgram === "Bachelor" ? "BSc" : "MSc"
            } in ${finalDepartment}`
          : "";

      const profileData = {
        ...otherData,
        bio,
        currentProgram: formattedProgram,
      };

      // Update user name if provided
      if (name && name.trim()) {
        const nameUpdateResult = await ApiService.updateUserName(name.trim());
        if (!nameUpdateResult.success) {
          alert(`Failed to update name: ${nameUpdateResult.error}`);
          return;
        }
        // Update user context with new name
        updateUser({ name: name.trim() });
      }

      // Update student ID if provided
      if (studentId && studentId.trim()) {
        const studentIdResult = await ApiService.updateStudentId(
          studentId.trim()
        );
        if (!studentIdResult.success) {
          alert(
            `Failed to update student ID: ${
              studentIdResult.message || "Unknown error"
            }`
          );
          return;
        }
        // Update user context
        updateUser({ studentId: studentId.trim() });
      }

      // Create or update profile with remaining data
      const res = await ApiService.createProfile(profileData);
      if (res.success) {
        setShowIntroForm(false);
        setProfile(res.data);

        // Show appropriate success message
        let message = "Profile created successfully!";
        const nameUpdated = name && name.trim();
        const studentIdUpdated = studentId && studentId.trim();

        if (nameUpdated && studentIdUpdated) {
          message = "Name, Student ID, and profile created successfully!";
        } else if (nameUpdated) {
          message = "Name and profile created successfully!";
        } else if (studentIdUpdated) {
          message = "Student ID and profile created successfully!";
        }

        alert(message);
      } else {
        alert(`Failed to create profile: ${res.error}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating profile");
    }
  };

  const [users, setUsers] = useState([]);

  // Use appropriate user name based on whose profile we're viewing
  const displayUser = isOwnProfile ? user : profileUser;
  const userName = displayUser?.name || "Unknown User";

  // Function to fetch user posts
  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        console.error("No user ID available to fetch posts");
        setLoadingPosts(false);
        return;
      }

      console.log(`Fetching posts for user ID: ${targetUserId}`);
      const posts = await postService.getUserPosts(targetUserId);
      console.log(
        `Retrieved ${posts.length} posts for user ${targetUserId}`,
        posts
      );
      setUserPosts(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setUserPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Function to render the profile picture
  const profilePicture = (
    <img
      src={profilePictureUrl || "/default_avatar.png"}
      alt="Profile"
      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() =>
        openImageModal(profilePictureUrl || "/default_avatar.png", "profile")
      }
      onError={(e) => {
        // Silently fall back to default avatar without logging errors
        // Only log actual errors if the fallback also fails
        if (e.target.src !== "/default_avatar.png") {
          e.target.src = "/default_avatar.png";
        }
      }}
    />
  );

  // Function to format image URLs
  const formatImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    // Check if it's already a full URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Check if it's a relative URL starting with a slash
    if (imageUrl.startsWith("/")) {
      // Get the base part of the API URL (without /api)
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const baseServerUrl = baseUrl.replace(/\/api$/, ""); // Remove /api if present
      return `${baseServerUrl}${imageUrl}`;
    }

    // If it's just a filename, prepend the full API URL path to uploads
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const baseServerUrl = baseUrl.replace(/\/api$/, ""); // Remove /api if present
    return `${baseServerUrl}/uploads/${imageUrl}`;
  };

  return (
    <div className="h-screen bg-gray-100 overflow-y-auto">
      <Navbar />
      {!isOwnProfile && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span className="text-lg">←</span>
              <span className="font-medium">Back</span>
            </button>
            <div className="text-gray-700">
              <span className="text-sm">Viewing profile of </span>
              <span className="font-semibold">{userName}</span>
            </div>
          </div>
        </div>
      )}
      {/* Main Container - Facebook uses max-width with centered content */}
      <div className="max-w-[1100px] mx-auto bg-white mt-[80px]">
        {/* Cover Photo Section */}
        <div className="relative">
          <div className="w-full h-[348px] bg-gradient-to-br from-green-400 via-green-500 to-green-600 overflow-hidden relative">
            {/* Cover Image */}
            {coverPictureUrl ? (
              <img
                src={coverPictureUrl}
                alt="Cover"
                className="w-full h-full object-cover rounded-b-[12px] cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openImageModal(coverPictureUrl, "cover")}
                onError={(e) => {
                  // If custom cover fails, show default gradient background
                  e.target.style.display = "none";
                }}
              />
            ) : (
              // Default gradient background when no cover picture
              <div className="w-full h-full bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-b-[12px]" />
            )}

            {/* Edit Cover Photo Button - Positioned over the cover photo */}
            {isOwnProfile && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {/* Hidden file input for cover upload */}
                <input
                  type="file"
                  ref={coverInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleCoverPictureUpload}
                />

                {/* Upload/Edit Cover Button */}
                <button
                  onClick={() => coverInputRef.current.click()}
                  disabled={uploadingCover}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
                >
                  {uploadingCover ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-gray-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-gray-700">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base">📷</span>
                      <span className="text-gray-700">
                        {coverPictureUrl
                          ? "Edit cover photo"
                          : "Add cover photo"}
                      </span>
                    </>
                  )}
                </button>

                {/* Delete Cover Button (only shows if user has a cover picture) */}
                {coverPictureUrl && (
                  <button
                    onClick={handleDeleteCoverPicture}
                    disabled={uploadingCover}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg shadow-sm transition-all duration-200 text-sm font-medium"
                    title="Remove cover picture"
                  >
                    <span className="text-base">🗑️</span>
                    <span className="text-red-700">Remove</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="bg-white">
          <div className="px-4">
            <div className="flex items-end justify-between -mt-[100px] ml-[30px] pb-4">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-[168px] h-[168px] rounded-full border-4 border-white shadow-lg bg-gray-300 overflow-hidden">
                  {profilePicture}
                </div>

                {/* Profile Picture Upload Button (only visible on own profile) */}
                {isOwnProfile && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="absolute bottom-2 right-2 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center shadow-sm transition-colors"
                      title="Change profile picture"
                      disabled={uploadingPicture}
                    >
                      {uploadingPicture ? (
                        <svg
                          className="animate-spin h-5 w-5 text-gray-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <span className="text-base">📷</span>
                      )}
                    </button>

                    {/* Delete Profile Picture Button (only shows if user has a profile picture) */}
                    {profilePictureUrl && (
                      <button
                        onClick={handleDeleteProfilePicture}
                        className="absolute bottom-2 left-2 w-9 h-9 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center shadow-sm transition-colors"
                        title="Remove profile picture"
                        disabled={uploadingPicture}
                      >
                        <span className="text-base">🗑️</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isOwnProfile && (
                <div className="flex gap-2 mb-4">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                    onClick={handleEditProfile}
                  >
                    <span>✏️</span>
                    <span>Edit profile</span>
                  </button>
                </div>
              )}
            </div>

            {/* Name and Info */}
            <div className="pb-4">
              <h1 className="text-[32px] font-bold text-gray-900 leading-tight mb-1">
                {userName}
              </h1>
            </div>
          </div>
        </div>
      </div>
      {/* Content Area - Matches Facebook's spacing */}
      <div className="max-w-[1100px] mx-auto mt-[10px]">
        <div className="flex gap-4 pt-4 px-4">
          {/* Left Sidebar - Fixed width like Facebook */}
          <div className="w-[500px] flex-shrink-0 mr-[10px]">
            {/* Intro Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Intro</h3>

              {loading ? (
                <p>Loading profile...</p>
              ) : !profile ? (
                isOwnProfile ? (
                  showIntroForm ? (
                    <form onSubmit={handleIntroSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <input
                            name="name"
                            value={introForm.name}
                            onChange={handleIntroChange}
                            placeholder="Enter your full name"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Student ID
                          </label>
                          <div className="relative">
                            <input
                              name="studentId"
                              value={introForm.studentId}
                              onChange={handleIntroChange}
                              placeholder="Enter your student ID (e.g., CSE-2024-001)"
                              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                studentIdError
                                  ? "border-red-300 bg-red-50"
                                  : studentIdAvailable === false
                                  ? "border-red-300 bg-red-50"
                                  : studentIdAvailable === true
                                  ? "border-green-300 bg-green-50"
                                  : "border-gray-300"
                              }`}
                            />
                            {checkingAvailability && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <svg
                                  className="animate-spin h-5 w-5 text-gray-400"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                              </div>
                            )}
                            {studentIdAvailable === true &&
                              !checkingAvailability && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <svg
                                    className="h-5 w-5 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    ></path>
                                  </svg>
                                </div>
                              )}
                            {studentIdAvailable === false &&
                              !checkingAvailability && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <svg
                                    className="h-5 w-5 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M6 18L18 6M6 6l12 12"
                                    ></path>
                                  </svg>
                                </div>
                              )}
                          </div>
                          {studentIdError && (
                            <p className="mt-1 text-sm text-red-600">
                              {studentIdError}
                            </p>
                          )}
                          {studentIdAvailable === false && !studentIdError && (
                            <p className="mt-1 text-sm text-red-600">
                              This student ID is already taken
                            </p>
                          )}
                          {studentIdAvailable === true && !studentIdError && (
                            <p className="mt-1 text-sm text-green-600">
                              Student ID is available
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              School Name
                            </label>
                            <input
                              name="schoolName"
                              value={introForm.schoolName}
                              onChange={handleIntroChange}
                              placeholder="Your school name"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              College Name
                            </label>
                            <input
                              name="collegeName"
                              value={introForm.collegeName}
                              onChange={handleIntroChange}
                              placeholder="Your college name"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department Category
                          </label>
                          <select
                            name="bio"
                            value={introForm.bio}
                            onChange={handleIntroChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Department Category</option>
                            {departmentCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Program Type
                            </label>
                            <select
                              name="currentProgram"
                              value={introForm.currentProgram}
                              onChange={handleIntroChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Program Type</option>
                              <option value="Bachelor">Bachelor</option>
                              <option value="Master">Master</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Specific Department
                            </label>
                            <select
                              name="currentDepartment"
                              value={introForm.currentDepartment}
                              onChange={handleIntroChange}
                              disabled={
                                !introForm.currentProgram || !introForm.bio
                              }
                              className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                !introForm.currentProgram || !introForm.bio
                                  ? "bg-gray-100 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <option value="">
                                Select Specific Department
                              </option>
                              {introForm.bio &&
                                getAvailableDepartments().map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Year
                              </label>
                              <select
                                name="currentYear"
                                value={introForm.currentYear}
                                onChange={handleIntroChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Year</option>
                                <option value="1st">1st Year</option>
                                <option value="2nd">2nd Year</option>
                                <option value="3rd">3rd Year</option>
                                <option value="4th">4th Year</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 w-[120px]">
                                Current Semester
                              </label>
                              <select
                                name="currentSemester"
                                value={introForm.currentSemester}
                                onChange={handleIntroChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Semester</option>
                                <option value="1st">1st</option>
                                <option value="2nd">2nd</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hometown
                            </label>
                            <input
                              name="hometown"
                              value={introForm.hometown}
                              onChange={handleIntroChange}
                              placeholder="Your hometown"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Residence
                            </label>
                            <input
                              name="currentResidence"
                              value={introForm.currentResidence}
                              onChange={handleIntroChange}
                              placeholder="Current residence"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Hall
                            </label>
                            <select
                              name="currentHall"
                              value={introForm.currentHall}
                              onChange={handleIntroChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Hall</option>
                              <option value="South">South</option>
                              <option value="North">North</option>
                              <option value="Utility">Utility</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Room Number
                            </label>
                            <input
                              name="currentRoom"
                              value={introForm.currentRoom}
                              onChange={handleIntroChange}
                              placeholder="Room number"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bed Number
                            </label>
                            <select
                              name="currentBed"
                              value={introForm.currentBed}
                              onChange={handleIntroChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Bed</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Save Intro
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowIntroForm(false)}
                          className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowIntroForm(true)}
                      className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors mb-4 text-sm"
                    >
                      Add intro
                    </button>
                  )
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>This user hasn't added an intro yet.</p>
                  </div>
                )
              ) : isOwnProfile ? (
                <div className="space-y-2">
                  {!showEditForm ? (
                    <button
                      type="button"
                      onClick={handleEditProfile}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl mb-4 text-sm flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Profile
                    </button>
                  ) : null}

                  {showEditForm ? (
                    <form onSubmit={handleEditSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <input
                            name="name"
                            value={introForm.name}
                            onChange={handleIntroChange}
                            placeholder="Enter your full name"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Student ID
                          </label>
                          <div className="relative">
                            <input
                              name="studentId"
                              value={introForm.studentId}
                              onChange={handleIntroChange}
                              placeholder="Enter your student ID (e.g., CSE-2024-001)"
                              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                studentIdError
                                  ? "border-red-300 bg-red-50"
                                  : studentIdAvailable === false
                                  ? "border-red-300 bg-red-50"
                                  : studentIdAvailable === true
                                  ? "border-green-300 bg-green-50"
                                  : "border-gray-300"
                              }`}
                            />
                            {checkingAvailability && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <svg
                                  className="animate-spin h-5 w-5 text-gray-400"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                              </div>
                            )}
                            {studentIdAvailable === true &&
                              !checkingAvailability && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <svg
                                    className="h-5 w-5 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    ></path>
                                  </svg>
                                </div>
                              )}
                            {studentIdAvailable === false &&
                              !checkingAvailability && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <svg
                                    className="h-5 w-5 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M6 18L18 6M6 6l12 12"
                                    ></path>
                                  </svg>
                                </div>
                              )}
                          </div>
                          {studentIdError && (
                            <p className="mt-1 text-sm text-red-600">
                              {studentIdError}
                            </p>
                          )}
                          {studentIdAvailable === false && !studentIdError && (
                            <p className="mt-1 text-sm text-red-600">
                              This student ID is already taken
                            </p>
                          )}
                          {studentIdAvailable === true && !studentIdError && (
                            <p className="mt-1 text-sm text-green-600">
                              Student ID is available
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              School Name
                            </label>
                            <input
                              name="schoolName"
                              value={introForm.schoolName}
                              onChange={handleIntroChange}
                              placeholder="Your school name"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              College Name
                            </label>
                            <input
                              name="collegeName"
                              value={introForm.collegeName}
                              onChange={handleIntroChange}
                              placeholder="Your college name"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department Category
                          </label>
                          <select
                            name="bio"
                            value={introForm.bio}
                            onChange={handleIntroChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Department Category</option>
                            {departmentCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Program Type
                            </label>
                            <select
                              name="currentProgram"
                              value={introForm.currentProgram}
                              onChange={handleIntroChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Program Type</option>
                              <option value="Bachelor">Bachelor</option>
                              <option value="Master">Master</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Specific Department
                            </label>
                            <select
                              name="currentDepartment"
                              value={introForm.currentDepartment}
                              onChange={handleIntroChange}
                              disabled={
                                !introForm.currentProgram || !introForm.bio
                              }
                              className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                !introForm.currentProgram || !introForm.bio
                                  ? "bg-gray-100 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <option value="">
                                Select Specific Department
                              </option>
                              {introForm.bio &&
                                getAvailableDepartments().map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Year
                              </label>
                              <select
                                name="currentYear"
                                value={introForm.currentYear}
                                onChange={handleIntroChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Year</option>
                                <option value="1st">1st Year</option>
                                <option value="2nd">2nd Year</option>
                                <option value="3rd">3rd Year</option>
                                <option value="4th">4th Year</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 w-[120px]">
                                Current Semester
                              </label>
                              <select
                                name="currentSemester"
                                value={introForm.currentSemester}
                                onChange={handleIntroChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Semester</option>
                                <option value="1st">1st</option>
                                <option value="2nd">2nd</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hometown
                            </label>
                            <input
                              name="hometown"
                              value={introForm.hometown}
                              onChange={handleIntroChange}
                              placeholder="Your hometown"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Residence
                            </label>
                            <input
                              name="currentResidence"
                              value={introForm.currentResidence}
                              onChange={handleIntroChange}
                              placeholder="Current residence"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Hall
                            </label>
                            <select
                              name="currentHall"
                              value={introForm.currentHall}
                              onChange={handleIntroChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Hall</option>
                              <option value="South">South</option>
                              <option value="North">North</option>
                              <option value="Utility">Utility</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Room Number
                            </label>
                            <input
                              name="currentRoom"
                              value={introForm.currentRoom}
                              onChange={handleIntroChange}
                              placeholder="Room number"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bed Number
                            </label>
                            <select
                              name="currentBed"
                              value={introForm.currentBed}
                              onChange={handleIntroChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Bed</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={formLoading}
                          className={`flex-1 py-3 px-4 font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            formLoading
                              ? "bg-blue-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          } text-white`}
                        >
                          {formLoading ? (
                            <div className="flex items-center justify-center">
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Saving...
                            </div>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEditForm(false)}
                          disabled={formLoading}
                          className={`flex-1 py-3 px-4 font-medium rounded-lg transition-colors ${
                            formLoading
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        <strong>আসসালামু আলাইকুম ভাই/আপু।</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি{" "}
                        <strong> {displayUser?.name || "Unknown User"}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি <strong> {profile.schoolName}</strong>   থেকে এসএসসি
                        পাশ করেছি
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        এবং <strong> {profile.collegeName}</strong>   থেকে
                        এইচএসসি পাশ করেছি
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি বর্তমানে
                        <strong>ইসলামিক ইউনিভার্সিটি অফ টেকনোলজিতে</strong>{" "}
                        <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        <strong>{profile.bio}</strong>   ডিপার্টমেন্টে <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentProgram}</strong>}   প্রোগ্রামে{" "}
                        <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentYear}</strong>}   বর্ষে <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentSemester}</strong>}  
                        সেমিস্টারে অধ্যয়নরত আছি।
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমার স্টুডেন্ট আইডি  {" "}
                        <strong>{displayUser?.studentId || "Not set"}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমার হোমটাউন   <strong>{profile.hometown}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমার বর্তমান বাসা  {" "}
                        <strong>{profile.currentResidence}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি ইসলামিক ইউনিভার্সিটি অফ টেকনোলজির{" "}
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        <strong>{profile.currentHall}</strong>   হল অফ রেসিডেন্স
                        বিল্ডিং এ{" "}
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentRoom}</strong>}   রুমে{" "}
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentBed}</strong>}   বেডে থাকি।
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>আসসালামু আলাইকুম ভাই/আপু।</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি <strong>{displayUser?.name || "Unknown User"}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি <strong> {profile.schoolName}</strong>   থেকে এসএসসি পাশ
                    করেছি
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    এবং <strong> {profile.collegeName}</strong>   থেকে এইচএসসি
                    পাশ করেছি
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি বর্তমানে
                    <strong>ইসলামিক ইউনিভার্সিটি অফ টেকনোলজিতে</strong> <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.bio}</strong>   ডিপার্টমেন্টে <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    {<strong>{profile.currentProgram}</strong>}   প্রোগ্রামে{" "}
                    <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    {<strong>{profile.currentYear}</strong>}   বর্ষে <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    {<strong>{profile.currentSemester}</strong>}   সেমিস্টারে
                    অধ্যয়নরত আছি।
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমার স্টুডেন্ট আইডি  {" "}
                    <strong>{displayUser?.studentId || "Not set"}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমার হোমটাউন   <strong>{profile.hometown}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমার বর্তমান বাসা  {" "}
                    <strong>{profile.currentResidence}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি ইসলামিক ইউনিভার্সিটি অফ টেকনোলজির{" "}
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentHall}</strong>   হল অফ রেসিডেন্স
                    বিল্ডিং এ{" "}
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    {<strong>{profile.currentRoom}</strong>}   রুমে{" "}
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    {<strong>{profile.currentBed}</strong>}   বেডে থাকি।
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Takes remaining space */}
          <div className="flex-1 min-w-0">
            {/* Create Post */}

            {/* Posts Section Heading */}
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-600">📝</span>
                Posts
              </h2>
            </div>

            {/* Loading state */}
            {loadingPosts && (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              </div>
            )}

            {/* No posts message */}
            {!loadingPosts && (!userPosts || userPosts.length === 0) && (
              <div className="bg-white p-6 text-center rounded-lg shadow-sm mt-4">
                <p className="text-gray-500">No posts to show.</p>
              </div>
            )}

            {/* Posts */}
            {!loadingPosts &&
              userPosts &&
              userPosts.length > 0 &&
              userPosts.map((post, index) => (
                <div
                  key={post.id || index}
                  className="bg-[#f9fafb] rounded-[25px] mt-4 shadow-sm mb-[20px]"
                >
                  {/* Post Header */}
                  <div className="flex items-start gap-3 p-4 pb-3 ml-[10px]">
                    <div className="w-[42px] h-[42px] mr-[12px] rounded-full overflow-hidden flex-shrink-0 mt-[30px]">
                      <img
                        src={
                          post.user?.profile?.profilePicture
                            ? ApiService.getProfilePictureUrl(post.user.id)
                            : "/default_avatar.png"
                        }
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (e.target.src !== "/default_avatar.png") {
                            e.target.src = "/default_avatar.png";
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[15px] text-gray-900 mt-[30px]">
                        {post.isAnonymous
                          ? "Anonymous"
                          : post.user?.name || userName}
                      </h4>
                      <p className="text-[13px] text-gray-500 flex items-center gap-1 ">
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        • <span className="text-blue-500">🌐</span>
                      </p>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                      <span className="text-xl">⋯</span>
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3 ml-[10px]">
                    <div className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </div>
                    {post.image && (
                      <div className="mt-3">
                        <img
                          src={formatImageUrl(post.image)}
                          alt="Post"
                          className="w-full h-auto rounded-lg"
                          onError={(e) => {
                            console.error("Image failed to load:", post.image);
                            e.target.src =
                              "https://via.placeholder.com/400x300?text=Image+Not+Available";
                            e.target.onerror = null;
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reactions and Comments Count */}
                  <div className="flex justify-between items-center px-4 py-2 text-[18px] ml-[10px] text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        <span className="text-blue-500">👍</span>
                      </div>
                      <span>
                        {post._count?.reactions || post.likesCount || 0}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="mr-[5px]">
                        {post._count?.comments || 0} comments
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-around border-t border-gray-200 py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        postService
                          .reactToPost(post.id, "LIKE")
                          .then(() => fetchUserPosts())
                          .catch((err) =>
                            console.error("Failed to like post:", err)
                          );
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1"
                    >
                      <span>👍</span>
                      <span>Like</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                      <span>💬</span>
                      <span>Comment</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50"
          style={{
            background: "rgba(55, 65, 81, 0.5)", // gray-700 with opacity
            backdropFilter: "blur(12px) saturate(180%)",
            WebkitBackdropFilter: "blur(12px) saturate(180%)",
          }}
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
              title="Close (ESC)"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image */}
            <img
              src={modalImageUrl}
              alt={
                modalImageType === "profile"
                  ? "Profile Picture"
                  : "Cover Picture"
              }
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
              onError={(e) => {
                if (
                  modalImageType === "profile" &&
                  e.target.src !== "/default_avatar.png"
                ) {
                  e.target.src = "/default_avatar.png";
                }
              }}
            />

            {/* Image info */}
            <div
              className="absolute bottom-4 left-4 text-white px-3 py-2 rounded-lg"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <span className="text-sm font-medium">
                {modalImageType === "profile"
                  ? "Profile Picture"
                  : "Cover Picture"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
