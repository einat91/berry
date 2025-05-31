import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function Home() {
  const [user, setUser] = useState(null);
  const [dogName, setDogName] = useState("");
  const [family, setFamily] = useState([]);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [familyCode, setFamilyCode] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setDogName(data.dogName);
          setFamily(data.familyMembers || []);
          setPhotoUrl(data.photoUrl || null);
          setFamilyCode(data.familyCode || "");
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-white">
      <div className="flex items-center justify-between w-full mb-8">
        <Image
          src="/logo.png"
          alt="Berry Logo"
          width={80} // Increased logo size
          height={80}
        />
        <div className="text-right">
          {user && <p className="text-sm">Signed in as {user.displayName}</p>}
          <p className="text-xs text-gray-500">Family Code: {familyCode}</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt="Dog"
            width={120}
            height={120}
            className="rounded-full border border-black"
          />
        ) : (
          <div className="w-[120px] h-[120px] rounded-full border border-black flex items-center justify-center text-gray-400">
            No photo
          </div>
        )}
        <h1 className="text-3xl font-bold mt-4">{dogName} 🐶</h1>
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Family Members</h2>
        <ul className="list-disc list-inside">
          {family.map((member, index) => (
            <li key={index}>{member}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Entry</h2>
        {/* Components to handle adding entries for today and previous days */}
        {/* Allow assigning different family members */}
      </div>
    </main>
  );
}
