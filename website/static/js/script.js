$(document).ready(function () {
  FunctionModule.Init();
  FunctionModule.InitEvents();
});

const FunctionModule = (function () {
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  const Init = function () {
    try {
      $("#text-prompt").focus();
    } catch (e) {
      console.log("Init: " + e.message);
    }
  };

  const InitEvents = function () {
    try {
      $("#checkbox-switch-mode").on("click", function () {
        toggleSwitchMode(this);
      });

      $("#float-btn").on("click", function () {
        toggleListImage();
      });

      $(".option").on("click", function () {
        selectOption(this);
      });

      $("#text-prompt").on("input", function () {
        validateTextPrompt(this);
      });

      $(".btn-gradient-transition").on("click", function () {
        generateImage();
      });

      $("#inputImage").on("change", function () {
        importImage(this);
      });

      $(".image-generated").on("click", function () {
        showImage(this);
      });

      $("#btn-download-image").on("click", function () {
        downloadImage($("#img-center").attr("src"));
      });

      $("#user-avatar").on("click", function () {
        toggleUserAvatar();
      });

      $("#login-dialog").on("click", function (event) {
        if (event.target.id === "login-dialog") {
          $("#login-dialog").hide();
        }
      });

      $("#close-login-dialog").on("click", function () {
        $("#login-dialog").hide();
      });

      $("#login-btn").on("click", function () {
        $("#login-dialog").show();
      });

      $("#btn-login-google").on("click", function () {
        openPopupLoginWithGoogle();
      });

      $("#btn-logout").on("click", function () {
        logout();
      });
    } catch (e) {
      console.log("InitEvents: " + e.message);
    }
  };

  const toggleSwitchMode = function (element) {
    if ($(element).is(":checked")) {
      $("#image-container").show();
      $("#image-dimensions-container").hide();
    } else {
      $("#image-container").hide();
      $("#image-dimensions-container").show();
    }
  };

  const toggleListImage = function () {
    const arrow = $("#arrow");
    const imageListContainer = $("#list-img-container");
    const imgCenter = $("#img-center");
    if (imageListContainer.hasClass("lg:w-80")) {
      imageListContainer.removeClass("lg:w-80");
      imageListContainer.addClass("w-0");
      imageListContainer.removeClass("px-5");
      arrow.addClass("rotate-180");
      imgCenter.removeAttr("class");
      imgCenter.addClass("scale-[120%]");
    } else {
      imageListContainer.removeClass("w-0");
      imageListContainer.addClass("lg:w-80");
      imageListContainer.addClass("px-5");
      arrow.removeClass("rotate-180");
      imgCenter.removeAttr("class");
      imgCenter.addClass("scale-125 transition-all duration-500");
    }
  };

  const selectOption = function (element) {
    $(".option").removeClass("bg-[#3B3947]");
    $(element).addClass("bg-[#3B3947]");
  };

  const validateTextPrompt = function (element) {
    const btnGenerate = $(".btn-gradient-transition");
    if ($(element).val().length !== 0) {
      btnGenerate.removeAttr("disabled");
    } else {
      btnGenerate.attr("disabled", "disabled");
    }
  };

  const generateImage = function () {
    const loadingOverlay = $("#loading-overlay");
    const textPrompt = $("#text-prompt");
    let height,
      width = 0;
    $(".option").each(function () {
      if ($(this).hasClass("bg-[#3B3947]")) {
        const size = $(this).children("div").first().text().split("x");
        height = parseInt(size[0], 10);
        width = parseInt(size[1], 10);
      }
    });

    loadingOverlay.addClass("load");
    if ($("#checkbox-switch-mode").is(":checked")) {
      $.ajax({
        type: "POST",
        url: "/image-to-image",
        data: {
          text_prompt: textPrompt.val(),
        },
        success: function (response) {
          textPrompt.val("");
          $(".btn-gradient-transition").attr("disabled", "disabled");
          if (response.error) {
            showError(response.error);
            return;
          }
          const imageCenter = $("#img-center");
          imageCenter.attr("src", response.image_url);
          addImageHTML(response.image_url);
          $("#btn-download-image").show();
          loadingOverlay.removeClass("load");
          showSuccess("Image generated successfully");
        },
        error: function (error) {
          loadingOverlay.removeClass("load");
          textPrompt.val("");
          $(".btn-gradient-transition").attr("disabled", "disabled");
          showError("Error generating image");
          console.log(error);
        },
      });
    } else {
      $.ajax({
        type: "POST",
        url: "/text-to-image",
        data: {
          text_prompt: textPrompt.val(),
          height: height,
          width: width,
        },
        success: function (response) {
          textPrompt.val("");
          $(".btn-gradient-transition").attr("disabled", "disabled");
          if (response.error) {
            showError(response.error);
            return;
          }
          const imageCenter = $("#img-center");
          imageCenter.attr("src", response.image_url);
          addImageHTML(response.image_url);
          $("#btn-download-image").show();
          loadingOverlay.removeClass("load");
          showSuccess("Image generated successfully");
        },
        error: function (error) {
          loadingOverlay.removeClass("load");
          textPrompt.val("");
          $(".btn-gradient-transition").attr("disabled", "disabled");
          showError("Error generating image");
          console.log(error);
        },
      });
    }
  };

  const addImageHTML = function (src) {
    const listImages = $("#list-images");
    const newDiv = $("<div></div>");
    newDiv.addClass(
      "image-generated w-[136px] h-48 opacity-50 hover:opacity-100 image-placeholder-animation rounded-md overflow-hidden"
    );
    newDiv.html(
      `<div class="h-full w-full flex justify-center items-center">
        <div
          class="flex w-full h-full relative rounded-[6px] shadow-md justify-center"
        >
          <img
            class="transition-all duration-500 object-fill cursor-pointer"
            src="${src}"
          />
        </div>
      </div>`
    );
    listImages.prepend(newDiv);
  };

  const importImage = function (element) {
    const imageChange = $("#image-change");
    const trashAndImage = $("#trash-and-image");
    const file = $(element)[0].files[0];
    imageChange.attr("src", URL.createObjectURL(file));
    trashAndImage.show();

    const formData = new FormData();
    formData.append("image", file);
    $.ajax({
      type: "POST",
      url: "/import-image",
      data: formData,
      contentType: false,
      processData: false,
      success: function (response) {
        if (response.error) {
          showError(response.error);
          return;
        }
        showSuccess("Image imported successfully");
      },
      error: function (error) {
        showError("Error importing image");
        console.log(error);
      },
    });
  };

  const showSuccess = function (message) {
    toast.fire({
      icon: "success",
      title: message,
    });
  };

  const showError = function (message) {
    toast.fire({
      icon: "error",
      title: message,
    });
  };

  const showWarning = function (message) {
    toast.fire({
      icon: "warning",
      title: message,
    });
  };

  const showImage = function (element) {
    const imageUrl = $(element)
      .children("div")
      .children("div")
      .children("img")
      .attr("src");
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success",
        cancelButton: "btn btn-danger",
      },
      buttonsStyling: true,
    });
    swalWithBootstrapButtons
      .fire({
        imageUrl: imageUrl,
        imageAlt: "Image",
        showCancelButton: true,
        confirmButtonText: "Download Image",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        imageHeight: 500,
      })
      .then((result) => {
        if (result.isConfirmed) {
          downloadImage(imageUrl);
        }
      });
  };

  const downloadImage = function (imageUrl) {
    // const downloadLink = $("<a>")
    //   .attr("href", imageUrl)
    //   .attr("download", "")
    //   .appendTo("body");
    // downloadLink[0].click();
    // downloadLink.remove();
  };

  const toggleUserAvatar = function () {
    $("#user-info-container").toggle();
  };

  const logout = function () {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie.trim();
      document.cookie =
        name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const openPopupLoginWithGoogle = function () {
    $.ajax({
      type: "GET",
      url: "/login",
      success: function (response) {
        window.open(response.url, "popup", "width=600,height=600");
      },
      error: function (error) {
        showError("Error logging in with Google");
        console.log(error);
      },
    });
  };

  return {
    Init: Init,
    InitEvents: InitEvents,
  };
})();
