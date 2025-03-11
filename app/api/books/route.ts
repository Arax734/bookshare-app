import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get search parameters from the request
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") || "10";
  const search = searchParams.get("search") || "";
  const sinceId = searchParams.get("sinceId") || "";

  // Construct URL for BN API
  let url = `https://data.bn.org.pl/api/institutions/bibs.json?limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sinceId) url += `&sinceId=${sinceId}`;

  try {
    // Make server-side request to BN API
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}
