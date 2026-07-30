import { NextResponse } from "next/server";

// Garde des routes d'ÉCRITURE ouvertes aux agents (création, clôture).
//
// Volontairement minimale : une seule clé, dans une variable d'environnement.
// Pas de table de clés, pas de scopes, pas de quotas — tant qu'il n'y a qu'un
// appelant, une table serait de l'architecture sans utilisateur. Le jour où il
// y en a deux, c'est ici et nulle part ailleurs qu'on remplace la garde.
//
// Échoue FERMÉ : sans AGENT_KEY configurée, les routes refusent. Une variable
// oubliée doit couper l'agent, pas ouvrir l'écriture à tout Internet.
export function denyAgent(req: Request): NextResponse | null {
  const key = process.env.AGENT_KEY;
  if (!key) {
    return NextResponse.json({ error: "agent_api_disabled" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${key}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
