// a script which mocks  200 concurrent requests which reveals race conditions

async function multiPostRequests() {
  await Promise.all(
    Array.from({ length: 200 }, () =>
      fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "dfdfd",
          password: "fdfdfds",
        }),
      }),
    ),
  );
}

multiPostRequests();
