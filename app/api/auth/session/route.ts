import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // Get cookies instance and await it
    const cookieStore = await cookies();

    // Set the session cookie
    cookieStore.set("firebase-session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Failed to set session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();

    // Remove the session cookie with correct method signature
    cookieStore.delete("firebase-session-token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
