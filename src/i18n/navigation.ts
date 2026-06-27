import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Helpers de navigation conscients de la locale (à utiliser à la place de next/link/router).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
