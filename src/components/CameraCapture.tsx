import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RefreshCw, Upload, X } from "lucide-react";
import imageCompression from "browser-image-compression";

interface CameraCaptureProps {
  onImageCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onImageCapture, onClose }: CameraCaptureProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

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

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Capture Math Problem</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {!imgSrc ? (
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
          <img src={imgSrc} alt="Captured" className="w-full h-full object-contain" />
        )}
      </div>

      <div className="flex gap-2">
        {!imgSrc ? (
          <>
            <Button onClick={capture} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
            <Button onClick={handleFlipCamera} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="icon"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
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
