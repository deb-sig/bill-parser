'use client';
import React,  { ChangeEvent } from 'react';
import PostalMime from 'postal-mime';



const Home: React.FC = () => {
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // if (file && file.type === 'application/pdf') {
    if (file) {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
        const email = await PostalMime.parse(typedArray);
        console.log('eml', email.html)
        const parser = new DOMParser();
        const doc = parser.parseFromString(email.html || "", 'text/html');
        console.log(doc)
      };

      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <input type="file" accept=".eml" onChange={handleFileChange} />
    </div>
  );
}

export default Home;
