import React from "react";

export default function CatBreak() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-green-700">Relax with Cats 🐾</h2>
      <div className="aspect-video">
        <iframe
          className="w-full h-full rounded-lg shadow"
          src="https://www.youtube.com/embed/tntOCGkgt98"
          title="Relaxing Cat Video"
          allowFullScreen
        />
      </div>
    </div>
  );
}
