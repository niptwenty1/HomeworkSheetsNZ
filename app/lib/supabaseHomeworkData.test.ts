import { beforeEach, describe, expect, it, vi } from "vitest";
import { flagStudentForResend, getStudentById } from "./supabaseHomeworkData";
import getSupabaseServerClient from "./supabaseServer";

vi.mock("./supabaseServer", () => ({
  default: vi.fn(),
}));

const mockedGetSupabaseServerClient = vi.mocked(getSupabaseServerClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("flagStudentForResend", () => {
  it("updates only the selected signup id when an id is provided", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    mockedGetSupabaseServerClient.mockReturnValue({ from } as never);

    await flagStudentForResend({
      id: 42,
      email: "shared@example.com",
      date: "2026-08-26",
      reason: "Selected student",
    });

    expect(from).toHaveBeenCalledWith("signups");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        resend: true,
        resend_date: "2026-08-26",
        resend_reason: "Selected student",
      }),
    );
    expect(eq).toHaveBeenCalledWith("id", 42);
  });
});

describe("getStudentById", () => {
  it("looks up the selected signup by id rather than email", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { child_name: "Selected Student", email: "shared@example.com", year_level: "5", days: "Monday" },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    mockedGetSupabaseServerClient.mockReturnValue({ from } as never);

    const student = await getStudentById(42);

    expect(student?.child_name).toBe("Selected Student");
    expect(from).toHaveBeenCalledWith("signups");
    expect(select).toHaveBeenCalledWith("child_name, email, year_level, days");
    expect(eq).toHaveBeenCalledWith("id", 42);
  });
});
