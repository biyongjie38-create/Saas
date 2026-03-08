"use client";

import { useEffect } from "react";
import NextError from "next/error";
import * as Sentry from "@sentry/nextjs";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={500} />
      </body>
    </html>
  );
}
