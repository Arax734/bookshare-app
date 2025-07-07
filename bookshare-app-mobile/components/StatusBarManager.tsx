import React from 'react';
import { StatusBar } from 'expo-status-bar';

interface StatusBarManagerProps {
  children: React.ReactNode;
}

export default function StatusBarManager({ children }: StatusBarManagerProps) {
  return (
    <>
      <StatusBar style="dark" backgroundColor="white" translucent={false} />
      {children}
    </>
  );
}
