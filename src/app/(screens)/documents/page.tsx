"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Camera,
  FileText,
  CheckCircle2,
  X,
  CreditCard,
  Car,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface Document {
  id: string;
  name: string;
  description: string;
  status: "pending" | "uploaded" | "verified" | "rejected";
  images: string[];
  required: boolean;
  maxImages: number;
  icon: LucideIcon;
}

const initialDocuments: Document[] = [
  {
    id: "aadhar",
    name: "Aadhar Card",
    description: "Government ID with photo",
    status: "verified",
    images: ["https://via.placeholder.com/150x100"],
    required: true,
    maxImages: 2,
    icon: CreditCard,
  },
  {
    id: "driving",
    name: "Driving License",
    description: "Valid driving license",
    status: "uploaded",
    images: ["https://via.placeholder.com/150x100"],
    required: true,
    maxImages: 2,
    icon: Car,
  },
  {
    id: "rc",
    name: "Vehicle RC",
    description: "Vehicle registration certificate",
    status: "pending",
    images: [],
    required: true,
    maxImages: 2,
    icon: FileText,
  },
  {
    id: "bank",
    name: "Bank Passbook",
    description: "First page with account details",
    status: "rejected",
    images: [],
    required: true,
    maxImages: 1,
    icon: Building,
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  uploaded: { label: "In Review", className: "bg-amber-500/10 text-amber-500" },
  verified: { label: "Verified", className: "bg-primary/10 text-primary" },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
};

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const handleCapture = (docId: string) => {
    setUploadingDoc(docId);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        setUploadingDoc(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setDocuments((prev) =>
          prev.map((doc) => {
            if (doc.id === docId) {
              const newImages = [...doc.images, reader.result as string];
              return {
                ...doc,
                images: newImages,
                status: newImages.length > 0 ? "uploaded" : "pending",
              };
            }
            return doc;
          })
        );
        setUploadingDoc(null);
        toast.success("Image uploaded successfully");
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const removeImage = (docId: string, imageIndex: number) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const newImages = doc.images.filter((_, i) => i !== imageIndex);
          return {
            ...doc,
            images: newImages,
            status: newImages.length > 0 ? "uploaded" : "pending",
          };
        }
        return doc;
      })
    );
  };

  const uploadedCount = documents.filter((d) => d.images.length > 0).length;
  const totalRequired = documents.filter((d) => d.required).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-4 max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {uploadedCount}/{totalRequired} documents uploaded
            </p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(uploadedCount / totalRequired) * 100}%` }}
          />
        </div>
      </div>

      {/* Documents List */}
      <main className="p-4 max-w-lg mx-auto space-y-4">
        {documents.map((doc) => {
          const IconComponent = doc.icon;
          const status = statusConfig[doc.status];
          const isUploading = uploadingDoc === doc.id;

          return (
            <Card key={doc.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {doc.name}
                        {doc.required && (
                          <span className="text-destructive text-sm">*</span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Uploaded Images */}
                {doc.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {doc.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <Image
                          src={img}
                          alt={`${doc.name} ${idx + 1}`}
                          width={80}
                          height={80}
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                          unoptimized
                        />
                        <button
                          onClick={() => removeImage(doc.id, idx)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {doc.status === "verified" && (
                          <div className="absolute bottom-1 right-1 bg-primary rounded-full p-0.5">
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {doc.images.length < doc.maxImages && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCapture(doc.id)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        {doc.images.length === 0
                          ? "Upload Image"
                          : "Add Another Image"}
                      </>
                    )}
                  </Button>
                )}

                {/* Status Message */}
                {doc.status === "rejected" && (
                  <p className="text-sm text-destructive">
                    Document was rejected. Please upload a clear image.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Document Guidelines
                </p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• All documents must be clearly visible</li>
                  <li>• Upload both front and back where applicable</li>
                  <li>• Documents should not be expired</li>
                  <li>• Verification takes 24-48 hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
