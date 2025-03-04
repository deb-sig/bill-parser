'use client';
import Link from "next/link";

const Home: React.FC = () => {

  return (
    <div className="flex flex-col">
      <Link href="/cmb-debit">CMB Debit</Link>
      <Link href="/cmb-credit">CMB Credit</Link>
    </div>
  );
}

export default Home;
