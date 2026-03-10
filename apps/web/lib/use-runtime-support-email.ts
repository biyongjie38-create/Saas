"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/support-contact";

type SupportInfoResponse = {
  ok: boolean;
  data: {
    support_email?: string;
  } | null;
};

let cachedSupportEmail: string | null = null;
let inflightSupportEmailRequest: Promise<string> | null = null;

async function fetchRuntimeSupportEmail(): Promise<string> {
  const response = await fetch("/api/support/info", {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const payload = (await response.json().catch(() => null)) as SupportInfoResponse | null;
  const email = payload?.data?.support_email?.trim();

  if (!response.ok || !email) {
    throw new Error("SUPPORT_EMAIL_FETCH_FAILED");
  }

  return email;
}

export function useRuntimeSupportEmail(initialEmail = DEFAULT_SUPPORT_EMAIL): string {
  const [supportEmail, setSupportEmail] = useState(cachedSupportEmail ?? initialEmail);

  useEffect(() => {
    let ignore = false;

    if (cachedSupportEmail) {
      return () => {
        ignore = true;
      };
    }

    if (!inflightSupportEmailRequest) {
      inflightSupportEmailRequest = fetchRuntimeSupportEmail()
        .then((email) => {
          cachedSupportEmail = email;
          return email;
        })
        .catch(() => initialEmail)
        .finally(() => {
          inflightSupportEmailRequest = null;
        });
    }

    void inflightSupportEmailRequest.then((email) => {
      if (!ignore) {
        setSupportEmail(email);
      }
    });

    return () => {
      ignore = true;
    };
  }, [initialEmail]);

  return supportEmail;
}
