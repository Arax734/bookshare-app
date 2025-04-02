import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") || "10";
  const search = searchParams.get("search") || "";
  const searchType = searchParams.get("searchType") || "title";
  const sinceId = searchParams.get("sinceId") || "";

  let url = `https://data.bn.org.pl/api/institutions/bibs.json?limit=${limit}&kind=książka`;

  if (search) {
    switch (searchType) {
      case "title":
        url += `&title=${encodeURIComponent(search)}`;
        break;
      case "author":
        url += `&author=${encodeURIComponent(search)}`;
        break;
      case "isbn":
        url += `&isbnIssn=${encodeURIComponent(search)}`;
        break;
      default:
        url += `&search=${encodeURIComponent(search)}`;
    }
  }

  if (sinceId) {
    url += `&sinceId=${sinceId}`;
  }

  try {
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
