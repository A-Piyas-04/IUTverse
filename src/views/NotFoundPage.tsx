"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button, EmptyState } from "@/components/ui/Ui";
export function NotFoundPage(){return <main style={{minHeight:"100vh",display:"grid",placeItems:"center"}}><EmptyState title="Page not found" body="The campus path you followed does not exist." action={<Button><Link href="/"><Home size={17}/>Back to Home</Link></Button>}/></main>}
