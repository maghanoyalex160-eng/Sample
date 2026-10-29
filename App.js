
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import emailjs from "@emailjs/react-native";
import "./global.css";

const CATEGORIES = [
  "Account Problem",
  "Technical Issue",
  "Payment Concern",
  "Other",
];

export default function App() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issueCategory, setIssueCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal Confirmation
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title, message) => {
    setAlertModal({
      visible: true,
      title,
      message,
    });
  };

  const handleSelectImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showAlert(
          "Permission Denied",
          "Gallery Access is required to select a screenshot.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      showAlert("Error", "An error occurred while opening the image gallery.");
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary environment variables are missing!");
    }

    const filename = uri.split("/").pop() || "screenshot.jpg";

    const imageResponse = await fetch(uri);
    const blob = await imageResponse.blob()


    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("upload_preset", uploadPreset)

    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      https://api.cloudinary.com/v1_1/${cloudName}/image/upload,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      throw new Error(data.error?.message || "Failed to upload image.");
    }
    return data.secure_url;
  };

  const sendSupportEmail = async (params) => {
    const serviceid = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
    const templateid = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceid || !templateid || !publicKey) {
      throw new Error("EmailJS environment variables are missing.");
    }

    const templateParams = {
      name: params.name,
      reply_to: params.email,
      issue_category: params.issueCategory,
      message: params.message,
      image_url: params.imageUrl || "No screenshot provided",
    };

    return await emailjs.send(serviceid, templateid, templateParams, {
      publicKey,
    });
  };

  // 1. Triggered when clicking "Submit Ticket" — Performs Local Validation
  const handleOpenVerificationModal = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      showAlert("Validation Error", "Please fill out all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert("Validation Error", "Please enter a valid email address!");
      return;
    }

    // Validation passed -> Show Verification Modal
    setIsModalVisible(true);
  };

  // 2. Triggered when clicking "Confirm & Send" inside the Modal
  const handleConfirmSubmit = async () => {
    setLoading(true);

    try {
      let uploadUrl = "";

      if (imageUri) {
        try {
          uploadUrl = await uploadImageToCloudinary(imageUri);
        } catch (uploadError) {
          console.log("Cloudinary Error: ", uploadError);
          showAlert(
            "Upload Failed",
            "Screenshot upload failed. Email was not sent. Please try again.",
          );
          setLoading(false);
          setIsModalVisible(false);
          return;
        }
      }

      await sendSupportEmail({
        name: name.trim(),
        email: email.trim(),
        issueCategory,
        message: message.trim(),
        imageUrl: uploadUrl,
      });

      setIsModalVisible(false);
      showAlert("Success", "Your support ticket has been sent successfully!");

      // Reset Form
      setName("");
      setEmail("");
      setIssueCategory(CATEGORIES[0]);
      setMessage("");
      setImageUri(null);
    } catch (emailError) {
      console.log("EmailJS Error", emailError);
      showAlert("Error", "Failed to send support request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView contentContainerStyle={styles.container}>
          <Text className="text-2xl font-bold text-slate-900 mb-1 text-center">
            Support Ticketing
          </Text>
          <Text className="text-center text-sm text-slate-500 mb-2">
            Fill out the form below to report a problem or issue.
          </Text>

          <View className="flex-1 bg-white border border-slate-200 mt-3 rounded-2xl p-5 shadow-sm">
            {/* Full Name */}
            <Text className="text-sm font-semibold text-slate-700">
              Full Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="John Doe"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              editable={!loading}
              className="bg-slate-100 p-3.5 my-2 rounded-xl text-slate-900 font-medium border border-slate-200"
            />

            {/* Email Address */}
            <Text className="text-sm font-semibold text-slate-700 mt-2">
              Email Address <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="johndoe@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              className="bg-slate-100 p-3.5 my-2 rounded-xl text-slate-900 font-medium border border-slate-200"
            />

            {/* Issue Category */}
            <Text className="text-sm font-semibold text-slate-700 mt-2 mb-2">
              Issue Category <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {CATEGORIES.map((cat) => {
                const isSelected = issueCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    disabled={loading}
                    onPress={() => setIssueCategory(cat)}
                    className={`px-3.5 py-2 rounded-full border ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-100 border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message */}
            <Text className="text-sm font-semibold text-slate-700 mt-2">
              Message <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="Describe your issue in detail..."
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              className="bg-slate-100 p-3.5 my-2 rounded-xl text-slate-900 font-medium border border-slate-200 h-28"
            />

            {/* Screenshot Attachment */}
            <Text className="text-sm font-semibold text-slate-700 my-2">
              Screenshot (Optional)
            </Text>
            <TouchableOpacity
              disabled={loading}
              onPress={handleSelectImage}
              className={`bg-slate-100 border border-dashed border-slate-400 p-3.5 rounded-xl items-center justify-center ${
                loading ? "opacity-50" : ""
              }`}
            >
              <Text className="text-slate-700 font-semibold text-sm">
                {imageUri
                  ? "Change Screenshot"
                  : "Choose Screenshot from Gallery"}
              </Text>
            </TouchableOpacity>

            {/* Image Preview */}
            {imageUri && (
              <View className="mt-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Image
                  source={{ uri: imageUri }}
                  className="w-44 h-44 rounded-lg mb-2"
                  resizeMode="cover"
                />
                {!loading && (
                  <TouchableOpacity onPress={() => setImageUri(null)}>
                    <Text className="text-red-600 font-semibold text-xs">
                      Remove Screenshot
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Initial Submit Button (Triggers Validation & Opens Modal) */}
            <TouchableOpacity
              disabled={loading}
              onPress={handleOpenVerificationModal}
              className={`bg-blue-600 p-4 rounded-xl items-center justify-center mt-5 ${
                loading ? "opacity-50" : ""
              }`}
            >
              <Text className="text-white font-bold text-base">
                Submit Ticket
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* --- VERIFICATION MODAL --- */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!loading) setIsModalVisible(false);
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-5">
            <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100">
              <Text className="text-lg font-bold text-slate-900 text-center mb-1">
                Confirm Ticket Details
              </Text>
              <Text className="text-xs text-slate-500 text-center mb-4">
                Please verify your information before submitting.
              </Text>

              {/* Input Verification Summary */}
              <View className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4">
                <Text className="text-xs text-slate-500 mb-1">
                  Name:{" "}
                  <Text className="font-semibold text-slate-800">{name}</Text>
                </Text>
                <Text className="text-xs text-slate-500 mb-1">
                  Email:{" "}
                  <Text className="font-semibold text-slate-800">{email}</Text>
                </Text>
                <Text className="text-xs text-slate-500 mb-1">
                  Category:{" "}
                  <Text className="font-semibold text-blue-600">
                    {issueCategory}
                  </Text>
                </Text>
                <Text className="text-xs text-slate-500 mb-1" numberOfLines={2}>
                  Message:{" "}
                  <Text className="font-medium text-slate-800">{message}</Text>
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Attachment:{" "}
                  <Text className="font-semibold text-slate-800">
                    {imageUri ? "Screenshot attached" : "None"}
                  </Text>
                </Text>
              </View>

              {/* Modal Actions */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  disabled={loading}
                  onPress={() => setIsModalVisible(false)}
                  className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                >
                  <Text className="text-slate-700 font-semibold text-sm">
                    Edit Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={loading}
                  onPress={handleConfirmSubmit}
                  className="flex-1 bg-blue-600 py-3 rounded-xl items-center justify-center flex-row"
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-sm">
                      Confirm & Send
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={alertModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() =>
            setAlertModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-5">
            <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100 items-center">
              {/* Dynamic Title */}
              <Text className="text-lg font-bold text-slate-900 text-center mb-2">
                {alertModal.title}
              </Text>

              {/* Dynamic Message */}
              <Text className="text-sm text-slate-600 text-center mb-6 leading-5">
                {alertModal.message}
              </Text>

              {/* Action Button */}
              <TouchableOpacity
                onPress={() =>
                  setAlertModal((prev) => ({ ...prev, visible: false }))
                }
                className="bg-blue-600 w-full py-3.5 rounded-xl items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
});