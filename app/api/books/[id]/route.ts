import { NextRequest, NextResponse } from "next/server";
import { use } from "react";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unwrappedParams = await params;

  try {
    const response = await fetch(
      `https://data.bn.org.pl/api/networks/bibs.json?id=${unwrappedParams.id}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.bibs && Array.isArray(data.bibs) && data.bibs.length > 0) {
      return NextResponse.json(data.bibs[0]);
    }

    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching book details:", error);
    return NextResponse.json(
      { error: "Failed to fetch book details" },
      { status: 500 }
    );
  }
}
