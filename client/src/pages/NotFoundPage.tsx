import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button, EmptyState } from "@/components/ui/Ui";
export function NotFoundPage(){return <main style={{minHeight:"100vh",display:"grid",placeItems:"center"}}><EmptyState title="Page not found" body="The campus path you followed does not exist." action={<Button><Link to="/"><Home size={17}/>Back to Home</Link></Button>}/></main>}
