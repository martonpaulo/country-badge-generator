const FLAG_CDN_BASE_URL = "https://flagcdn.com";

export async function fetchFlagSvg(countryCode) {
  const response = await fetch(
    `${FLAG_CDN_BASE_URL}/${countryCode.toLowerCase()}.svg`,
    {
      cache: "force-cache",
      headers: {
        Accept: "image/svg+xml"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `The flag could not be loaded for ${countryCode}.`
    );
  }

  return response.text();
}

export function loadSvgImage(svgText) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], {
      type: "image/svg+xml"
    });

    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error("The flag image could not be processed.")
      );
    };

    image.src = objectUrl;
  });
}
