import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import ReusableAutocomplete from "./ReusableAutocomplete";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("ReusableAutocomplete", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("can commit free-solo input immediately", async () => {
    const onChange = jest.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ReusableAutocomplete
          freeSolo
          commitOnInputChange
          name="model"
          label="Model"
          value=""
          options={[]}
          onChange={onChange}
        />
      );
    });

    const input = container.querySelector('input[name="model"]');
    await act(async () => {
      Simulate.change(input, { target: { value: "manual-model" } });
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: "model",
          value: "manual-model",
        }),
      })
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
