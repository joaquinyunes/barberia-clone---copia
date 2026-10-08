import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `globals`, Testing Library no limpia solo: sin esto el DOM de un test se filtra al siguiente.
afterEach(cleanup);
