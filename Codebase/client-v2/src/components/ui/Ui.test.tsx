import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Button, Input } from "./Ui";

type Credentials = { email: string; password: string };

function LoginHarness({ onSubmit }: { onSubmit(data: Credentials): void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Credentials>();
  return <form onSubmit={handleSubmit(onSubmit)}>
    <Input aria-label="IUT Email" {...register("email", { required: "Required" })} />
    {errors.email && <span>{errors.email.message}</span>}
    <Input aria-label="Password" type="password" {...register("password", { required: "Required" })} />
    {errors.password && <span>{errors.password.message}</span>}
    <Button type="submit">Login</Button>
  </form>;
}

describe("form controls", () => {
  it("forwards refs so React Hook Form receives populated login values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginHarness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getAllByText("Required")).toHaveLength(2);

    await user.type(screen.getByRole("textbox", { name: "IUT Email" }), "nurenfahmid@iut-dhaka.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await waitFor(() => expect(screen.queryByText("Required")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      { email: "nurenfahmid@iut-dhaka.edu", password: "password123" },
      expect.anything(),
    ));
  });
});
