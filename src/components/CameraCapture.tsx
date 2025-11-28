import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RefreshCw, Upload, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from "@/lib/capacitor";

interface CameraCaptureProps {
  onImageCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onImageCapture, onClose }: CameraCaptureProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Native camera capture using Capacitor
  const captureNative = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      const base64String = `data:image/jpeg;base64,${image.base64String}`;
      setImgSrc(base64String);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  // Web camera capture
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const handleCapture = () => {
    if (isNative) {
      captureNative();
    } else {
      capture();
    }
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleRetake = () => {
    setImgSrc(null);
  };

  const handleUsePhoto = async () => {
    if (imgSrc) {
      try {
        // Convert base64 to blob
        const response = await fetch(imgSrc);
        const blob = await response.blob();
        
        // Compress image
        const compressedFile = await imageCompression(blob as File, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        // Convert back to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          onImageCapture(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        onImageCapture(imgSrc);
      }
    }
  };

  // Native gallery/file picker
  const handleNativeGallery = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      const base64String = `data:image/jpeg;base64,${image.base64String}`;
      setImgSrc(base64String);
    } catch (error) {
      console.error('Error picking photo:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setImgSrc(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  const handleUploadClick = () => {
    if (isNative) {
      handleNativeGallery();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Capture Math Problem</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {!imgSrc ? (
          <>
            {!isNative ? (
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode,
                  width: 1920,
                  height: 1080,
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <Camera className="h-16 w-16 opacity-50" />
              </div>
            )}
          </>
        ) : (
          <img src={imgSrc} alt="Captured" className="w-full h-full object-contain" />
        )}
      </div>

      <div className="flex gap-2">
        {!imgSrc ? (
          <>
            <Button onClick={handleCapture} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
            {!isNative && (
              <Button onClick={handleFlipCamera} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleUploadClick}
              variant="outline"
              size="icon"
              title="Upload from Gallery"
            >
              <Upload className="h-4 w-4" />
            </Button>
            {!isNative && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            )}
          </>
        ) : (
          <>
            <Button onClick={handleRetake} variant="outline" className="flex-1">
              Retake
            </Button>
            <Button onClick={handleUsePhoto} className="flex-1">
              Use Photo
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
