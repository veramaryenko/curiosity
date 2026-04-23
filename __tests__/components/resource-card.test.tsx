import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResourceCard } from "@/components/resource-card";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe("ResourceCard", () => {
  it("renderuje null gdy resources jest null", () => {
    const { container } = render(<ResourceCard resources={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderuje null gdy resources nie ma video ani article", () => {
    const { container } = render(<ResourceCard resources={{ video: null, article: null }} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderuje kartę video z tytułem i kanałem", () => {
    render(
      <ResourceCard
        resources={{
          video: {
            url: "https://www.youtube.com/watch?v=abc123",
            title: "Naucz się rysować",
            channel: "ArtChannel",
            thumbnail: null,
            published_at: null,
          },
        }}
      />
    );
    expect(screen.getByText("Naucz się rysować")).toBeInTheDocument();
    expect(screen.getByText("YouTube · ArtChannel")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc123");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("generuje miniaturę z YouTube ID gdy thumbnail jest null", () => {
    const { container } = render(
      <ResourceCard
        resources={{
          video: {
            url: "https://www.youtube.com/watch?v=abc123",
            title: "Film",
            channel: "Kanał",
            thumbnail: null,
            published_at: null,
          },
        }}
      />
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://img.youtube.com/vi/abc123/mqdefault.jpg");
  });

  it("renderuje chip artykułu z tytułem i źródłem", () => {
    render(
      <ResourceCard
        resources={{
          article: {
            url: "https://medium.com/some-article",
            title: "Jak zacząć rysować",
            source: "medium.com",
          },
        }}
      />
    );
    expect(screen.getByText("Jak zacząć rysować")).toBeInTheDocument();
    expect(screen.getByText("· medium.com")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://medium.com/some-article");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renderuje obie sekcje gdy są oba zasoby", () => {
    render(
      <ResourceCard
        resources={{
          video: {
            url: "https://www.youtube.com/watch?v=xyz",
            title: "Film tutorial",
            channel: "Kanał",
            thumbnail: null,
            published_at: null,
          },
          article: {
            url: "https://blog.com/art",
            title: "Artykuł",
            source: "blog.com",
          },
        }}
      />
    );
    expect(screen.getByText("Film tutorial")).toBeInTheDocument();
    expect(screen.getByText("Artykuł")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
